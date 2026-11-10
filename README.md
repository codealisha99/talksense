<img src="assets/icon.svg" width="64" height="64" alt="">

# talksense

Learn anything in 20 minutes, then prove it out loud.

1. **Pick a topic** and a study time (15 / 20 / 30 min).
2. **Get a brief**: 3–5 concrete things you should be able to explain, key terms, and places to start.
3. **Study anywhere** while the dial timer runs.
4. **Explain it out loud.** Your voice is transcribed with OpenAI, then graded against a fixed rubric.
5. **Get rated and share** a public result page on X or LinkedIn.

Live: https://web-production-c32cc2.up.railway.app

## Rubric

Every topic uses the same four parts, each scored 0–4 by the model. The 0–100 total is computed on the
server (`src/rubric.ts`), so shared scores can't be forged by the client.

| Part | Weight | 0 | 4 |
|---|---|---|---|
| Coverage | 35% | no objectives addressed | every objective addressed |
| Accuracy | 30% | major misconceptions | no factual errors |
| Depth | 20% | only names terms | explains why and how, with examples |
| Clarity | 15% | incoherent | could teach a beginner |

Levels: Novice < 40 ≤ Apprentice < 60 ≤ Practitioner < 75 ≤ Expert < 90 ≤ Master.

## Stack

- **Client**: React + Vite + `motion`. No router, no UI kit.
- **Server**: Hono on Node (runs TypeScript directly), Zod validation, per-IP rate limit.
- **DB**: Neon Postgres (`sessions` table, auto-migrated on boot).
- **AI**: bring-your-own OpenAI key. It's kept in the browser and forwarded per request; the server never stores or logs it.
- **Hosting**: Railway (`railway.json`).

## Develop

```bash
npm install
echo "DATABASE_URL=postgres://…" > .env
npm run dev:api   # API on :3000
npm run dev       # app on :5173, proxies /api
npm test          # rubric + streak tests
```

Optional env: `CHAT_MODEL` (default `gpt-6-astra`), `TRANSCRIBE_MODEL` (default `gpt-transcribe`), `PORT`.
