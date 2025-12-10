# Deployed Worker URLs & Endpoints

## Production URLs

- **Gateway Worker:** https://papamica-gateway.workers.dev
- **Main Bot Worker:** https://papamica-bot.workers.dev
- **GAS Web App Endpoint:** https://script.google.com/macros/s/<YOUR_DEPLOY_ID>/exec

## Development (Local)

- **Gateway (dev):** http://localhost:8787
- **Bot (dev):** http://localhost:8788

---

## Configuration

### In LINE Official Account Manager

Go to **Basic Settings** > **Webhook URL** and set:

\\\
https://papamica-gateway.workers.dev/webhook
\\\

### In Cloudflare Dashboard

1. Go to Workers & Pages > papamica-gateway
2. Settings > Environments
3. Add secret: \GAS_ENDPOINT\ = your GAS deployment URL

---

## Environment Variables (wrangler.toml / .env)

\\\
GAS_ENDPOINT=https://script.google.com/macros/s/{YOUR_DEPLOY_ID}/exec
LINE_CHANNEL_SECRET=your_secret
WEBHOOK_PATH=/webhook
\\\

---

## Testing Endpoints

### Test webhook locally:
\\\ash
curl -X POST http://localhost:8787/webhook \\
  -H "Content-Type: application/json" \\
  -H "X-Line-Signature: test_signature" \\
  -d '{"events": []}'
\\\

### Test production:
\\\ash
curl https://papamica-gateway.workers.dev/health
\\\

---

## Status Check

| Component | URL | Status |
|-----------|-----|--------|
| Gateway Worker | https://papamica-gateway.workers.dev/health |  |
| Bot Worker | https://papamica-bot.workers.dev/health |  |
| GAS Endpoint | https://script.google.com/macros/s/... |  |

---

## Notes

- Do NOT commit real URLs with secrets
- Store deployment IDs in environment variables
- Update this file after each deployment

See: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
