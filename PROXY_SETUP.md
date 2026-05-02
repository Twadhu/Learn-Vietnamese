# 📝 Backend Proxy Setup Instructions

## Quick Start for Server Deployment

### Prerequisites
- Vercel account (free): [vercel.com](https://vercel.com)
- GitHub repository already connected

### One-Click Deployment
1. Visit: https://vercel.com/new
2. Select "Twadhu/Learn-Vietnamese"
3. Under "Environment Variables", add:
   - **Name**: `VITE_FPT_API_KEY`
   - **Value**: `UuIJf19fwg6YfWEv3Imxj6GaMoT1R9Pi`
4. Click "Deploy"
5. Wait for deployment to complete → You'll get a **Vercel URL** (e.g., `https://learn-vietnamese-abc123.vercel.app`)

### Update Frontend
After getting your Vercel URL, update line 2 in `src/App.jsx`:
```javascript
const PROXY_ENDPOINT = "https://your-vercel-url.vercel.app/api/tts";
```

Then deploy frontend:
```bash
npm run deploy
```

## Done! ✅
Your app now works via:
- **Frontend**: https://twadhu.github.io/Learn-Vietnamese/
- **Backend Proxy**: https://your-vercel-url.vercel.app/ (private)

The proxy securely forwards all TTS requests to FPT.AI without CORS issues!
