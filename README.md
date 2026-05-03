# OmniShadow AI

Vite + React app for Vietnamese TTS shadowing, deployed on Vercel with a native serverless function for text-to-speech.

## What it does

- Generates Vietnamese speech through FPT.AI TTS v5.
- Uses a native Vercel function at `/api/tts` to avoid CORS.
- Plays generated segments in the browser and supports MP3 download.

## Local development

```bash
npm install
npm run dev
```

The app runs on `http://localhost:5173`.

## Production deployment

1. Connect this repository to Vercel.
2. Set the environment variable `VITE_FPT_API_KEY` in Vercel.
3. Deploy.

No frontend URL changes are needed. The app calls `/api/tts` directly.

## FPT TTS contract

- Request body: raw text string.
- Headers: `api-key`, `voice`, `speed`.
- Success response: JSON with the audio URL in `data`.

## Key files

- [src/App.jsx](src/App.jsx)
- [api/tts.js](api/tts.js)
- [vite.config.js](vite.config.js)
- [vercel.json](vercel.json)
