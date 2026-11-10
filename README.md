<img src="assets/icon.svg" width="64" height="64" alt="">

# talksense

Pick a topic → see what you should know → study for 15/20/30 min anywhere → explain it out loud → get rated.

```bash
npm install
npm run dev     # open the URL, paste your own OpenAI key in Settings
npm test        # rubric scoring checks
```

Bring-your-own-key: the key lives in browser localStorage and calls go straight to `api.openai.com`.
Speech is transcribed with OpenAI's transcription model, then graded against a fixed 4-part rubric
(Coverage 35%, Accuracy 30%, Depth 20%, Clarity 15%, each 0-4). The 0-100 total is computed in code (`src/rubric.ts`).
