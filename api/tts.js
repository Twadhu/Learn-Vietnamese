const FPT_ENDPOINT = 'https://api.fpt.ai/hmi/tts/v5';

export default async function handler(req, res) {
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
    const contentType = String(req.headers['content-type'] || '').toLowerCase();
    let text = '';
    if (contentType.includes('application/json')) {
      const body = req.body || {};
      text = typeof body === 'string' ? body : body.text;
    } else if (typeof req.body === 'string') {
      text = req.body;
    }

    const voice = (req.body && req.body.voice) || req.headers['voice'] || '';
    const speed = (req.body && req.body.speed) || req.headers['speed'] || '0';

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
        speed: String(speed),
        'Content-Type': 'text/plain; charset=utf-8',
      },
      body: String(text),
    });

    const textResponse = await response.text();

    let data = null;
    try {
      data = JSON.parse(textResponse);
    } catch (err) {
      // If FPT returns non-JSON on error, forward raw text
      return res.status(response.status >= 400 ? response.status : 500).json({ error: 'Invalid JSON from FPT', details: textResponse });
    }

    const audioUrl = data?.async || data?.data || data?.url || null;
    if (!response.ok || data?.error !== 0 || !audioUrl) {
      return res.status(response.status >= 400 ? response.status : 502).json({
        error: data?.message || 'FPT TTS request failed',
        details: data,
      });
    }

    // Forward FPT response JSON to the frontend
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({
      data: audioUrl,
      request_id: data.request_id,
      message: data.message,
      raw: data,
    });
  } catch (error) {
    console.error('tts function error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
