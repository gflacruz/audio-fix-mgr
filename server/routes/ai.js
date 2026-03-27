const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');

router.post('/diagnose', verifyToken, async (req, res) => {
  try {
    const { brand, model, issue } = req.body;
    if (!brand || !model || !issue)
      return res.status(400).json({ error: 'brand, model, and issue are required' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey)
      return res.status(500).json({ error: 'AI service is not configured on this server' });

    const prompt = `You are an experienced audio equipment repair technician. A customer brought in a ${brand} ${model}. The reported issue is: "${issue}". Please provide the most likely causes of this problem and a clear list of suggested diagnostic steps a technician should follow. Be concise and practical.`;

    const { default: fetch } = await import('node-fetch'); // ESM-only, needs dynamic import

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    );

    if (!geminiRes.ok) {
      const errBody = await geminiRes.json().catch(() => ({}));
      const detail = errBody?.error?.message || geminiRes.statusText;
      console.error('Gemini API error:', errBody);
      return res.status(502).json({ error: `Gemini error (${geminiRes.status}): ${detail}` });
    }

    const data = await geminiRes.json();
    const result = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!result) return res.status(502).json({ error: 'AI returned an empty response.' });

    res.json({ result });
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    res.status(500).json({ error: 'Failed to get AI response: ' + error.message });
  }
});

module.exports = router;
