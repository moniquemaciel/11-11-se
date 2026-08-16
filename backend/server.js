// Backend do Checkout Transparente (Checkout API) — Ritual 11:11
// Usa as credenciais do Mercado Pago via variáveis de ambiente.
// O Access Token NUNCA é enviado ao navegador — ele só existe aqui no servidor.
//
// MODELO DE COBRANÇA
// -------------------------------------------------------------------
// • Cartão de crédito → assinatura de verdade via API de Assinaturas do
//   Mercado Pago (recurso Preapproval). A pessoa autoriza uma vez e o
//   Mercado Pago cobra o cartão automaticamente todo mês, sem ação
//   nenhuma do lado de cá — é o mesmo modelo que a Netflix usa.
//   Cartão é o único método que a API de Assinaturas aceita hoje.
// • Pix e Boleto → não existe "débito automático" nativo pra esses
//   métodos no fluxo padrão do Mercado Pago (boleto nunca recorre
//   sozinho; Pix Automático é um produto separado, mais novo, que
//   precisa ser contratado à parte). Por isso, aqui eles continuam
//   sendo uma cobrança avulsa por ciclo — mas cada pagamento aprovado
//   já fica registrado com a data da PRÓXIMA cobrança, criando a base
//   pra lembrar a pessoa de renovar (por e-mail, WhatsApp etc. —
//   o envio automático de lembrete ainda depende de um serviço de
//   e-mail configurado à parte, ver README).
// -------------------------------------------------------------------

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MercadoPagoConfig, Payment, PreApproval } = require('mercadopago');

const app = express();
app.use(cors());
app.use(express.json());

if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
  console.warn('⚠️  MERCADO_PAGO_ACCESS_TOKEN não definido. Configure a variável de ambiente.');
}

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
});
const payment = new Payment(client);
const preapproval = new PreApproval(client);

// URL pública do site — usada como back_url da assinatura (pra onde o
// Mercado Pago manda a pessoa de volta em fluxos que precisam disso).
const SITE_URL = process.env.SITE_URL || 'https://loja.11e11-se.com.br';

// ---------------------------------------------------------------
// Planos do Ritual 11:11 — mantenha os valores aqui, nunca confie
// em um valor de preço enviado pelo frontend (evita fraude de preço).
// ---------------------------------------------------------------
const PLANS = {
  essencial: { name: 'Ritual 11:11 — Essencial', amount: 69.0 },
  classico: { name: 'Ritual 11:11 — Clássico', amount: 99.0 },
  premium: { name: 'Ritual 11:11 — Premium', amount: 169.0 },
};

// Armazenamento simples em memória — troque por um banco de dados
// (Postgres, MongoDB etc.) antes de usar em produção. Em memória,
// os registros somem toda vez que o servidor reinicia.
const orders = new Map();       // pagamentos avulsos (pix/boleto)
const subscribers = new Map();  // assinantes (cartão recorrente + pix/boleto com renovação manual)

function proximoMes(data) {
  const d = new Date(data);
  d.setMonth(d.getMonth() + 1);
  return d;
}

// -----------------------------------------------------------------
// ASSINATURA COM CARTÃO — cobrança automática mensal de verdade,
// via recurso Preapproval do Mercado Pago (API de Assinaturas).
// O token do cartão é gerado NO FRONTEND pelo SDK.js do Mercado Pago
// (o número do cartão nunca passa pelo seu servidor).
// -----------------------------------------------------------------
app.post('/api/assinatura/cartao', async (req, res) => {
  const { plano, token, email, docType, docNumber } = req.body;
  const plan = PLANS[plano];
  if (!plan) return res.status(400).json({ error: 'Plano inválido' });
  if (!token) return res.status(400).json({ error: 'Token do cartão ausente' });
  if (!email) return res.status(400).json({ error: 'E-mail ausente' });

  try {
    const result = await preapproval.create({
      body: {
        reason: plan.name,
        external_reference: plano,
        payer_email: email,
        card_token_id: token,
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: plan.amount,
          currency_id: 'BRL',
        },
        back_url: SITE_URL,
        status: 'authorized',
      },
    });

    subscribers.set(result.id, {
      tipo: 'cartao',
      plano,
      email,
      docType,
      docNumber,
      status: result.status,
      proximaCobranca: result.next_payment_date || null,
      criadoEm: new Date(),
    });

    res.json({
      subscriptionId: result.id,
      status: result.status,
      proximaCobranca: result.next_payment_date || null,
    });
  } catch (err) {
    console.error('Erro ao criar assinatura com cartão:', err);
    res.status(500).json({ error: 'Erro ao criar assinatura. Confira os dados do cartão.' });
  }
});

// -----------------------------------------------------------------
// CANCELAR ASSINATURA (cartão) — a pessoa pode cancelar quando quiser,
// igual a qualquer assinatura tipo Netflix.
// -----------------------------------------------------------------
app.post('/api/assinatura/cancelar/:id', async (req, res) => {
  try {
    const result = await preapproval.update({
      id: req.params.id,
      body: { status: 'cancelled' },
    });

    const existing = subscribers.get(req.params.id) || {};
    subscribers.set(req.params.id, { ...existing, status: result.status, canceladoEm: new Date() });

    res.json({ status: result.status });
  } catch (err) {
    console.error('Erro ao cancelar assinatura:', err);
    res.status(500).json({ error: 'Erro ao cancelar assinatura' });
  }
});

// -----------------------------------------------------------------
// PIX — cobrança avulsa (não recorre sozinha). Ao aprovar, registra
// a pessoa como assinante "pix" com a data da próxima renovação,
// pra dar base a um lembrete futuro.
// -----------------------------------------------------------------
app.post('/api/pagamento/pix', async (req, res) => {
  const { plano, email, nome, docType, docNumber } = req.body;
  const plan = PLANS[plano];
  if (!plan) return res.status(400).json({ error: 'Plano inválido' });

  try {
    const result = await payment.create({
      body: {
        transaction_amount: plan.amount,
        description: plan.name,
        payment_method_id: 'pix',
        payer: {
          email: email,
          first_name: nome || undefined,
          identification: docType && docNumber ? { type: docType, number: docNumber } : undefined,
        },
      },
    });

    orders.set(result.id, { plano, status: result.status, tipo: 'pix', email, criadoEm: new Date() });

    res.json({
      orderId: result.id,
      status: result.status,
      qrCodeBase64: result.point_of_interaction.transaction_data.qr_code_base64,
      copiaECola: result.point_of_interaction.transaction_data.qr_code,
    });
  } catch (err) {
    console.error('Erro ao criar pagamento Pix:', err);
    res.status(500).json({ error: 'Erro ao criar pagamento Pix' });
  }
});

// -----------------------------------------------------------------
// BOLETO — cobrança avulsa (não recorre sozinha). Mesmo tratamento
// de renovação manual do Pix.
// -----------------------------------------------------------------
app.post('/api/pagamento/boleto', async (req, res) => {
  const { plano, email, nome, sobrenome, docType, docNumber } = req.body;
  const plan = PLANS[plano];
  if (!plan) return res.status(400).json({ error: 'Plano inválido' });

  try {
    const result = await payment.create({
      body: {
        transaction_amount: plan.amount,
        description: plan.name,
        payment_method_id: 'bolbradesco',
        payer: {
          email,
          first_name: nome,
          last_name: sobrenome,
          identification: { type: docType, number: docNumber },
        },
      },
    });

    orders.set(result.id, { plano, status: result.status, tipo: 'boleto', email, criadoEm: new Date() });

    res.json({
      orderId: result.id,
      status: result.status,
      linkBoleto: result.transaction_details.external_resource_url,
    });
  } catch (err) {
    console.error('Erro ao gerar boleto:', err);
    res.status(500).json({ error: 'Erro ao gerar boleto' });
  }
});

// -----------------------------------------------------------------
// WEBHOOK — o Mercado Pago chama esta rota sempre que:
//  • um pagamento avulso muda de status (type: "payment")
//  • uma assinatura de cartão é criada/atualizada (type: "subscription_preapproval")
//  • uma cobrança recorrente do cartão acontece (type: "subscription_authorized_payment")
//
// Lembre de ativar esses 3 tópicos no painel do Mercado Pago em:
// Sua conta → Configurações → Webhooks
// -----------------------------------------------------------------
app.post('/api/webhook', async (req, res) => {
  const { type, data } = req.body;

  try {
    if (type === 'payment' && data && data.id) {
      const info = await payment.get({ id: data.id });
      const existing = orders.get(info.id) || {};
      orders.set(info.id, { ...existing, status: info.status, atualizadoEm: new Date() });
      console.log(`Pagamento ${info.id} → status: ${info.status}`);

      if (info.status === 'approved') {
        const existente = orders.get(info.id);
        if (existente && (existente.tipo === 'pix' || existente.tipo === 'boleto')) {
          subscribers.set(`${existente.tipo}-${info.id}`, {
            tipo: existente.tipo,
            plano: existente.plano,
            email: existente.email,
            status: 'approved',
            proximaCobranca: proximoMes(new Date()),
            criadoEm: new Date(),
          });
        }
        // TODO: liberar acesso do cliente, enviar e-mail de boas-vindas, etc.
      }
    }

    if ((type === 'subscription_preapproval' || type === 'subscription_authorized_payment') && data && data.id) {
      const info = await preapproval.get({ id: data.id });
      const existing = subscribers.get(info.id) || {};
      subscribers.set(info.id, {
        ...existing,
        status: info.status,
        proximaCobranca: info.next_payment_date || existing.proximaCobranca,
        atualizadoEm: new Date(),
      });
      console.log(`Assinatura ${info.id} → status: ${info.status}`);
    }
  } catch (err) {
    console.error('Erro ao processar webhook:', err);
  }

  // Responda 200 rapidamente — o Mercado Pago reenvia se não receber OK.
  res.sendStatus(200);
});

// -----------------------------------------------------------------
// Consulta de status — útil pro frontend checar se o Pix já caiu
// -----------------------------------------------------------------
app.get('/api/pedido/:id', (req, res) => {
  const order = orders.get(Number(req.params.id));
  if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });
  res.json(order);
});

// -----------------------------------------------------------------
// Painel simples de assinantes cujo Pix/Boleto está prestes a vencer
// (protegido por chave simples — configure ADMIN_KEY no ambiente).
// Útil enquanto não há envio automático de lembrete por e-mail.
// -----------------------------------------------------------------
app.get('/api/assinaturas/vencendo', (req, res) => {
  if (!process.env.ADMIN_KEY || req.query.admin_key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  const seteDias = 7 * 24 * 60 * 60 * 1000;
  const agora = Date.now();

  const vencendo = [...subscribers.values()].filter(s => {
    if (!s.proximaCobranca || (s.tipo !== 'pix' && s.tipo !== 'boleto')) return false;
    const venc = new Date(s.proximaCobranca).getTime();
    return venc - agora <= seteDias;
  });

  res.json(vencendo);
});

app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
