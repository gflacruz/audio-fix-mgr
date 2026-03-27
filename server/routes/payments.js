const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');

router.post('/terminal', verifyToken, async (req, res) => {
  const { amount, currency = 'USD', repairId } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  const { HELCIM_API_TOKEN, HELCIM_DEVICE_CODE } = process.env;
  if (!HELCIM_API_TOKEN || !HELCIM_DEVICE_CODE) {
    return res.status(500).json({ error: 'Helcim credentials not configured' });
  }

  const idempotencyKey = `${repairId ?? 'pos'}-${Date.now()}`;

  try {
    const { default: fetch } = await import('node-fetch');
    const response = await fetch(
      `https://api.helcim.com/v2/devices/${HELCIM_DEVICE_CODE}/payment/purchase`,
      {
        method: 'POST',
        headers: {
          'api-token': HELCIM_API_TOKEN,
          'accept': 'application/json',
          'content-type': 'application/json',
          'idempotency-key': idempotencyKey,
        },
        body: JSON.stringify({ currency, transactionAmount: amount }),
      }
    );

    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch (_) { data = {}; }

    if (!response.ok) {
      console.error('Helcim error response:', response.status, text);
      const msg = (typeof data?.errors?.[0] === 'string' ? data.errors[0] : null)
        || data?.errors?.[0]?.message
        || data?.message
        || data?.error
        || text
        || 'Helcim error';
      return res.status(502).json({ error: msg });
    }

    res.json({ success: true, transaction: data });
  } catch (err) {
    console.error('Helcim terminal error:', err);
    res.status(500).json({ error: 'Terminal request failed' });
  }
});

module.exports = router;
