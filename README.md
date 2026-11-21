# AG Painel (AG-MONITOR)

Site para o dono acompanhar a empresa pelo celular: vendas, pedidos na
produção e cotações em aberto. Só leitura. Consome a API do ERP
(AG-SYSTEM-API) e só entra quem tem a permissão `painel.executivo`.

- **Resumo**: vendido no período contra o período anterior, pedidos, margem,
  cotações em aberto, produção, atrasos e os últimos 12 meses.
- **Pedidos**: fila da produção (em produção, prontos, atrasados).
- **Vendas**: por vendedor, maiores clientes e pedidos do período.
- **Cotações**: em aberto e não vencidas, por data, valor ou dias parada.

Períodos: Hoje, Semana (de segunda até hoje), Mês e Ano. Os dados se atualizam
sozinhos a cada 5 minutos e quando o app volta para a tela. Dá para instalar no
celular (PWA): no Chrome, "Adicionar à tela inicial"; no iPhone, Safari →
Compartilhar → "Adicionar à Tela de Início".

## Endpoints usados

- `POST /auth/login`, `GET /auth/me`
- `GET /executive?period=` (números do painel executivo)
- `GET /monitor?period=` (listas: vendas, cotações em aberto, produção)

## Desenvolvimento

```bash
npm install
npm run dev        # http://localhost:5173, API em http://localhost:3333
```

A API local precisa de `CORS_ORIGINS=http://localhost:5173` no `.env`.
Para abrir no celular na mesma rede, use o IP do PC (`http://192.168.x.x:5173`),
coloque esse endereço também no `CORS_ORIGINS` e troque `VITE_API_URL` em
`.env.development.local` pelo IP do PC.

## Produção (AWS)

Mesma EC2 da API: o Caddy serve os arquivos de `/var/www/ag-painel` em
`https://painel.agaxismetalforte.com.br` (bloco no `deploy/Caddyfile` da
AG-SYSTEM-API) e emite o HTTPS sozinho.

1. DNS (Registro.br): registro `A painel → 13.184.65.13`.
2. API: `CORS_ORIGINS=https://painel.agaxismetalforte.com.br` no
   `/etc/ag-erp/api.env` e deploy da API (que instala o Caddyfile novo).
3. Site: `npm run deploy` (build + envio por SSH).
