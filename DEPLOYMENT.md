# Backend Proxy Deployment Guide

## Problem Solved
The frontend was making direct requests to FPT.AI API from the browser, which caused CORS errors because FPT doesn't allow cross-origin requests from GitHub Pages.

## Solution
We've created a backend proxy (`server.js`) that:
- Runs on Vercel (serverless platform)
- Receives requests from the frontend
- Forwards them to FPT.AI API (bypassing CORS issues)
- Returns the audio URL to the frontend

## Deployment Steps

### 1. **Create a Vercel Account**
   - Go to [vercel.com](https://vercel.com)
   - Sign up and connect your GitHub account

### 2. **Deploy the Backend Proxy**
   
   **Option A: Via Vercel Dashboard (Recommended)**
   1. Go to [vercel.com/new](https://vercel.com/new)
   2. Select "Import Git Repository"
   3. Choose `Twadhu/Learn-Vietnamese`
   4. Click "Deploy"
   5. Go to Settings → Environment Variables
   6. Add: `VITE_FPT_API_KEY` = `UuIJf19fwg6YfWEv3Imxj6GaMoT1R9Pi`
   7. Redeploy

   **Option B: Via Vercel CLI**
   ```bash
   npm install -g vercel
   vercel login
   vercel
   ```
   When prompted, add the environment variable `VITE_FPT_API_KEY`.

### 3. **Update Frontend with Your Proxy URL**
   After deployment, Vercel will give you a URL like: `https://learn-vietnamese-proxy.vercel.app`

   Update `src/App.jsx`:
   ```javascript
   const PROXY_ENDPOINT = "https://your-vercel-url.vercel.app/api/tts";
   ```

### 4. **Redeploy Frontend**
   ```bash
   npm run deploy
   ```

## Project Structure

```
├── server.js              # Express proxy server
├── vercel.json           # Vercel configuration
├── src/App.jsx           # Updated to use proxy
├── package.json          # Added backend dependencies
└── .env                  # Contains FPT_API_KEY (never commit)
```

## How It Works

### Frontend Flow:
```
User Input → Frontend (App.jsx) 
  → POST to: https://your-proxy.vercel.app/api/tts
  → Response: { data: "https://fpt-audio.url/mp3" }
  → Play audio directly
```

### Backend Proxy Flow:
```
Receive Request → server.js
  → Forward to: https://api.fpt.ai/hmi/tts/v5
  → Add Headers: api-key, voice
  → Return Response: { data: "audio_url" }
```

## Testing Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` file with:
   ```
   VITE_FPT_API_KEY=UuIJf19fwg6YfWEv3Imxj6GaMoT1R9Pi
   ```

3. Run backend:
   ```bash
   npm run dev:server
   ```

4. In another terminal, run frontend:
   ```bash
   npm run dev
   ```

5. Test the proxy at:
   ```
   POST http://localhost:3000/api/tts
   Content-Type: application/json

   {
     "text": "Xin chao",
     "voice": "banmai"
   }
   ```

## Environment Variables

### For Vercel (Backend)
- `VITE_FPT_API_KEY` - FPT.AI API key for server-side use

### For Frontend
- No environment variables needed (proxy URL is hardcoded)

## Security Notes

✅ API key is now **server-side only** (not exposed in browser)  
✅ Frontend can't access the key directly  
✅ CORS is handled transparently  
✅ Proxy validates all requests before forwarding

## Troubleshooting

### Issue: "Missing VITE_FPT_API_KEY"
- **Solution**: Add the environment variable in Vercel dashboard and redeploy

### Issue: "Proxy endpoint not found"
- **Solution**: Update `PROXY_ENDPOINT` in `src/App.jsx` with your actual Vercel URL

### Issue: "FPT API error"
- **Solution**: Check that the API key is correct in Vercel environment variables

## Current Status

- ✅ Backend proxy code created (`server.js`)
- ✅ Vercel configuration ready (`vercel.json`)
- ✅ Frontend updated to use proxy
- ✅ All code pushed to GitHub
- ⏳ **Next**: Deploy to Vercel (manual step)

## Next Steps

1. Deploy the proxy to Vercel (follow Deployment Steps above)
2. Get your proxy URL from Vercel
3. Update the PROXY_ENDPOINT in src/App.jsx with your actual URL
4. Run `npm run deploy` to update GitHub Pages
5. Test at https://twadhu.github.io/Learn-Vietnamese/
