# Ritual 11:11 — Checkout Transparente (Mercado Pago)

Backend em Node.js/Express que processa Pix, cartão de crédito e boleto
diretamente na sua página (sem redirecionar o cliente para o site do
Mercado Pago), usando a Checkout API.

## Como funciona

- **Public Key**: fica no frontend, é segura de expor (só permite gerar
  tokens de cartão, não faz cobranças sozinha).
- **Access Token**: fica só no backend, nunca é enviado ao navegador.
  É essa chave que autoriza cobranças de verdade na sua conta.
- O número do cartão nunca passa pelo seu servidor — o SDK.js do
  Mercado Pago tokeniza os dados direto no navegador do cliente
  (exigência de conformidade PCI). Seu backend só recebe o token.

## Passo a passo

### 1. Pegar suas credenciais
Acesse https://www.mercadopago.com.br/developers/panel/app e copie:
- Public Key (de produção, quando estiver pronta para vender de verdade;
  use a de teste enquanto estiver testando)
- Access Token (idem)

### 2. Instalar dependências
```
cd mp-checkout-transparente
npm install
```

### 3. Configurar variáveis de ambiente
Copie `.env.example` para `.env` e preencha com suas credenciais.
**Nunca** suba o `.env` para o GitHub — ele já está no `.gitignore`.

Se for hospedar em Vercel, Railway, Render etc., configure as mesmas
variáveis (`MERCADO_PAGO_PUBLIC_KEY` e `MERCADO_PAGO_ACCESS_TOKEN`)
direto no painel de "Environment Variables" do serviço — nunca no código.

### 4. Rodar localmente para testar
```
npm start
```
O servidor sobe em `http://localhost:3000`.

### 5. Configurar o webhook
No painel do Mercado Pago, em Configurações → Webhooks, cadastre:
```
https://SEU-DOMINIO.com/api/webhook
```
É essa rota que avisa seu sistema quando um Pix cai ou um cartão é
aprovado — sem ela, você teria que ficar checando manualmente.

### 6. Conectar o frontend
Veja `public/checkout-frontend.js` — ele mostra como:
- Tokenizar o cartão com o SDK.js do Mercado Pago (usando a Public Key)
- Chamar `/api/pagamento/pix`, `/api/pagamento/cartao` e
  `/api/pagamento/boleto`
- Exibir o QR Code Pix retornado pelo próprio Mercado Pago

Ajuste a constante `BACKEND_URL` no topo do arquivo para o endereço
onde este backend estiver rodando (ex: `https://api.11e11-se.com.br`).

## Onde hospedar
Qualquer serviço que rode Node.js funciona: Railway, Render, Fly.io,
uma VPS própria, etc. Não dá para rodar isso em um site estático (como
onde a landing page HTML está hoje) — ele precisa de um servidor ativo.

## Importante sobre segurança
- Nunca coloque o Access Token em nenhum arquivo que vá para o
  navegador (HTML, JS do frontend, etc.)
- Nunca cole o Access Token em conversas, e-mails ou tickets de suporte
- O armazenamento de pedidos neste exemplo é em memória (`Map`) — troque
  por um banco de dados real antes de operar com clientes de verdade,
  ou os pedidos somem toda vez que o servidor reiniciar
