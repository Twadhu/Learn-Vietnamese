import fetch from 'node-fetch';

const FPT_ENDPOINT = 'https://api.fpt.ai/hmi/tts/v5';

export default async function handler(req, res) {
  // Allow preflight for browsers, though front-end and function should be same-origin on Vercel
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body || {};
    const text = typeof body === 'string' ? body : body.text;
    const voice = body && body.voice ? body.voice : req.headers['voice'] || '';

    if (!text || !voice) {
      return res.status(400).json({ error: 'Missing required fields: text and voice' });
    }

    const FPT_API_KEY = process.env.VITE_FPT_API_KEY || process.env.FPT_API_KEY || '';
    if (!FPT_API_KEY) {
      return res.status(500).json({ error: 'Server misconfigured: VITE_FPT_API_KEY not set' });
    }

    const response = await fetch(FPT_ENDPOINT, {
      method: 'POST',
      headers: {
        'api-key': FPT_API_KEY,
        voice: String(voice),
        'Content-Type': 'text/plain; charset=utf-8',
      },
      body: String(text),
    });

    const textResponse = await response.text();

    if (!response.ok) {
      return res.status(response.status).json({ error: `FPT API error: ${response.status}`, details: textResponse });
    }

    let data;
    try {
      data = JSON.parse(textResponse);
    } catch (err) {
      return res.status(500).json({ error: 'Invalid JSON from FPT', details: textResponse });
    }

    if (!data || !data.data) {
      return res.status(500).json({ error: 'Invalid FPT response: missing data field', response: data });
    }

    // Return the audio URL from FPT
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ data: data.data });
  } catch (error) {
    console.error('tts function error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
