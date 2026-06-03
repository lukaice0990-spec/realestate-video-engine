// api/track-visit.js — 記錄頁面訪客到 Redis
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { page, referrer, device, title } = req.body || {};

    // Get IP from headers
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
      || req.headers['x-real-ip']
      || 'unknown';

    // Mask last octet for privacy
    const maskedIp = ip.replace(/\.\d+$/, '.***').replace(/:[^:]+$/, ':***');

    // Parse user-agent for device type
    const ua = req.headers['user-agent'] || '';
    let deviceType = device || 'desktop';
    if (!device) {
      if (/Mobile|Android|iPhone|iPad/i.test(ua)) deviceType = 'mobile';
      else if (/Tablet|iPad/i.test(ua)) deviceType = 'tablet';
    }

    // Parse referrer domain
    let refDomain = '';
    try {
      if (referrer && referrer !== 'direct') {
        const url = new URL(referrer);
        refDomain = url.hostname.replace(/^www\./, '');
      }
    } catch {}

    const record = {
      ts: new Date().toISOString(),
      page: (page || '/').substring(0, 100),
      title: (title || '').substring(0, 80),
      ref: refDomain || 'direct',
      device: deviceType,
      ip: maskedIp,
    };

    const KV_URL = process.env.KV_REST_API_URL;
    const KV_TOKEN = process.env.KV_REST_API_TOKEN;

    if (!KV_URL || !KV_TOKEN) {
      return res.status(200).json({ ok: true, note: 'no KV configured' });
    }

    // RPUSH to tirea:visits (keep max 3000 entries with LTRIM)
    const key = encodeURIComponent('tirea:visits');
    await fetch(`${KV_URL}/rpush/${key}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([JSON.stringify(record)]),
    });

    // Trim to last 3000 visits
    await fetch(`${KV_URL}/ltrim/${key}/-3000/-1`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['-3000', '-1']),
    });

    // Increment daily counter tirea:visits:YYYY-MM-DD
    const today = new Date().toISOString().slice(0, 10);
    const dayKey = encodeURIComponent(`tirea:visits:${today}`);
    await fetch(`${KV_URL}/incr/${dayKey}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
    });
    // Set TTL 90 days
    await fetch(`${KV_URL}/expire/${dayKey}/7776000`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['7776000']),
    });

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(200).json({ ok: false, error: e.message });
  }
}
