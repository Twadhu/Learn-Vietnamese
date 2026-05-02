import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const FPT_ENDPOINT = 'https://api.fpt.ai/hmi/tts/v5';
const FPT_API_KEY = process.env.VITE_FPT_API_KEY || '';

// Middleware
app.use(cors());
app.use(express.text({ type: 'text/plain' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'FPT TTS Proxy is running' });
});

// Main TTS proxy endpoint
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voice } = req.body;

    if (!text || !voice) {
      return res.status(400).json({
        error: 'Missing required fields: text and voice',
      });
    }

    if (!FPT_API_KEY) {
      return res.status(500).json({
        error: 'Server misconfigured: VITE_FPT_API_KEY not set',
      });
    }

    // Forward request to FPT API
    const response = await fetch(FPT_ENDPOINT, {
      method: 'POST',
      headers: {
        'api-key': FPT_API_KEY,
        voice: voice,
        'Content-Type': 'text/plain; charset=utf-8',
      },
      body: text,
    });

    const responseText = await response.text();

    if (!response.ok) {
      return res.status(response.status).json({
        error: `FPT API error: ${response.status}`,
        details: responseText,
      });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      return res.status(500).json({
        error: 'FPT returned invalid JSON',
        details: responseText,
      });
    }

    if (!data.data || typeof data.data !== 'string') {
      return res.status(500).json({
        error: 'Invalid FPT response format: missing audio URL in data field',
        response: data,
      });
    }

    res.json({ data: data.data });
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`FPT TTS Proxy server running on port ${PORT}`);
});
