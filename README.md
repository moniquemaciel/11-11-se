# Ritual 11:11 — 11:11-se

Site de assinatura mensal Ritual 11:11, com módulos interativos (Energia dos Cristais, Poder das Ervas, Rituais da Lua, Mensagem do Universo, Jornada de Autoconhecimento) e checkout transparente via Mercado Pago (Pix, cartão e boleto).

## Estrutura

- `frontend/` — site estático (HTML/CSS/JS puro). Publicar esta pasta como root directory na Vercel/Netlify.
- `backend/` — API do checkout transparente (Node/Express + SDK do Mercado Pago). Publicado separadamente (ex: Railway).

## Deploy do frontend

Ver `DEPLOY.md` para o passo a passo completo.

## Deploy do backend

```
cd backend
npm install
cp .env.example .env   # preencher com o Access Token real do Mercado Pago
npm start
```
