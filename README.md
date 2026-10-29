# Use-Case Discovery Coach

Single-component React demo wrapped in a Vite app. The browser calls `/api/chat`; the Vercel serverless function calls OpenAI with `OPENAI_API_KEY`.

## Local setup

```bash
npm install
npm run dev
```

For local API testing with Vercel's function runtime:

```bash
npm install -g vercel
vercel dev
```

Create a local `.env` file:

```bash
OPENAI_API_KEY=sk-proj-your-key-here
OPENAI_MODEL=gpt-4.1-mini
```

## Deploy on Vercel

1. Import this folder as a Vercel project.
2. Add `OPENAI_API_KEY` in Project Settings -> Environment Variables.
3. Optionally add `OPENAI_MODEL`; otherwise it uses `gpt-4.1-mini`.
4. Deploy.

Do not add `OPENAI_API_KEY` to any `VITE_` variable. `VITE_` variables are exposed to frontend code.
