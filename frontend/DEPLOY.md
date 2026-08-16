# Ritual 11:11 — Deploy do subdomínio loja.11e11-se.com.br

## O que já está pronto no código

- Título, meta description, canonical apontando para `https://loja.11e11-se.com.br/`
- Open Graph e Twitter Cards completos (com imagem própria gerada em `/assets/og-image.png`)
- JSON-LD (schema.org/Product) com os 3 planos e preços
- Favicons em todos os tamanhos padrão + `site.webmanifest`
- `robots.txt` e `sitemap.xml` apontando só para o subdomínio
- Todas as URLs de assets/meta usam `https://loja.11e11-se.com.br` — nada referencia o domínio principal

**Importante sobre o domínio principal:** `robots.txt`, sitemap e DNS são sempre configurados por
subdomínio — `loja.11e11-se.com.br` e `www.11e11-se.com.br` são endereços diferentes para o Google e
para os navegadores. Nada do que está aqui toca na configuração do site institucional na Yampi.

---

## 1. Escolha de hospedagem

Este projeto é um site estático (HTML puro) — roda em qualquer um destes serviços gratuitos:
**Vercel**, **Netlify** ou **Cloudflare Pages**. Recomendo **Vercel**, pela forma mais simples de
adicionar subdomínios customizados. Os passos abaixo cobrem os três.

### Vercel (recomendado)
1. Crie conta em vercel.com (pode entrar com GitHub)
2. **Add New → Project** → suba a pasta `loja-ritual-1111` (via GitHub ou `vercel` CLI)
3. Deploy automático gera uma URL tipo `https://loja-ritual-1111.vercel.app`
4. Vá em **Project → Settings → Domains** → adicione `loja.11e11-se.com.br`
5. A Vercel mostra exatamente qual registro DNS criar (veja seção 2)

### Netlify
1. Crie conta em netlify.com
2. **Add new site → Deploy manually** → arraste a pasta `loja-ritual-1111`
3. Em **Site settings → Domain management → Add custom domain** → `loja.11e11-se.com.br`
4. Netlify mostra o registro DNS necessário

### Cloudflare Pages
1. Crie conta em pages.cloudflare.com
2. **Create a project → Direct Upload** → suba a pasta `loja-ritual-1111`
3. Em **Custom domains → Set up a custom domain** → `loja.11e11-se.com.br`
4. Se seu domínio já usa Cloudflare como DNS, a configuração é automática

---

## 2. Registro DNS a criar

Onde quer que seu domínio `11e11-se.com.br` esteja gerenciado hoje (provavelmente no painel da
Yampi ou do registrador), você vai criar **apenas um registro novo**, sem tocar nos que já existem
para `www` ou o domínio raiz:

| Campo | Valor |
|---|---|
| Tipo | `CNAME` |
| Nome/Host | `loja` |
| Valor/Aponta para | *(fornecido pela hospedagem escolhida — veja abaixo)* |
| TTL | 3600 (1 hora) ou "Automático" |

**Valor do CNAME por hospedagem:**
- Vercel: `cname.vercel-dns.com`
- Netlify: `apex-loadbalancer.netlify.com` (ou o valor exato que a Netlify mostrar no painel — pode variar)
- Cloudflare Pages: gerenciado automaticamente se o domínio já estiver na Cloudflare

Esse registro CNAME é isolado — ele cria `loja.11e11-se.com.br` como um endereço próprio, sem alterar
os registros existentes de `www.11e11-se.com.br` ou do domínio raiz na Yampi.

---

## 3. HTTPS

Todas as três hospedagens (Vercel, Netlify, Cloudflare Pages) emitem certificado SSL automático
(Let's Encrypt) assim que o CNAME é validado — geralmente em minutos, às vezes até 24h. Redirecionamento
de HTTP para HTTPS também é automático nessas plataformas, não precisa configurar nada a mais.

---

## 4. Revisão de produção

| Item | Status |
|---|---|
| Links internos (Assinar → checkout, Voltar aos planos) | OK — funcionam via JS, sem depender de outro arquivo |
| Botões | OK — todos com estado hover/disabled tratado |
| Formulários (e-mail, cartão, boleto) | OK — validação básica de campos vazios |
| Scripts externos | Google Fonts + SDK do Mercado Pago via CDN — ambos com boa disponibilidade |
| **APIs** | **Pendente** — `BACKEND_URL` e `MP_PUBLIC_KEY` no `<script>` ainda estão com valores de exemplo, precisam ser preenchidos com os dados reais antes de publicar |
| Imagens | Logo com `alt` preenchido; OG image gerada em 1200×630 (padrão recomendado) |
| Fontes | Cinzel Decorative, Playfair Display, Jost — carregadas via Google Fonts com fallback padrão do navegador |
| SEO | Canonical, OG, Twitter Cards, JSON-LD, sitemap e robots.txt configurados |
| Performance | Página leve (sem frameworks pesados); único ponto de atenção é o logo em base64 embutido no HTML, que aumenta o tamanho do arquivo — se quiser otimizar depois, dá pra servir como arquivo separado em `/assets/` |
| Responsividade | Grid dos planos e benefícios já colapsam para 1 coluna em telas menores que 860px |
| Acessibilidade | Contraste dourado/navy adequado; falta `aria-label` em alguns ícones decorativos (não crítico) |

---

## 5. Escalabilidade para futuras landing pages

Para criar novas landing pages em outros subdomínios (`promo.11e11-se.com.br`,
`natal.11e11-se.com.br`, etc.) sem mexer na estrutura:

- Cada landing page vira **uma pasta própria** (ex: `lp-outra-oferta/`), com seu próprio `index.html`,
  `/assets`, `robots.txt` e `sitemap.xml`
- Cada pasta é publicada como **um projeto separado** na hospedagem escolhida, com seu próprio
  subdomínio customizado
- Isso significa: nenhuma alteração de configuração é necessária no projeto atual quando uma nova
  página é criada — é só repetir os passos das seções 1 e 2 com a nova pasta e o novo subdomínio

---

## 6. O que depende de você (checklist)

- [ ] Escolher a hospedagem (Vercel, Netlify ou Cloudflare Pages)
- [ ] Criar a conta e subir a pasta `loja-ritual-1111`
- [ ] Adicionar o domínio customizado `loja.11e11-se.com.br` no painel da hospedagem
- [ ] Criar o registro CNAME no DNS do seu domínio (Yampi ou registrador), conforme seção 2
- [ ] Aguardar a propagação do DNS e emissão do certificado SSL (geralmente minutos, até 24h)
- [ ] Pegar sua Public Key e Access Token reais do Mercado Pago
- [ ] Hospedar o backend (`server.js`) separadamente (ver instruções já entregues) e preencher
      `BACKEND_URL` e `MP_PUBLIC_KEY` no `index.html`

---

## Validação final

O código está pronto para publicação em `https://loja.11e11-se.com.br` — todas as URLs, meta tags e
assets já apontam para esse endereço. Nada nele referencia ou depende do domínio principal
`www.11e11-se.com.br`, então a publicação não afeta o site institucional. As únicas pendências são
as de infraestrutura (DNS, hospedagem) e credenciais (Mercado Pago), que só você pode executar.
