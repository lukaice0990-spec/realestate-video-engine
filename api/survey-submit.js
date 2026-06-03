import { sendTelegramLeadNotification } from '../lib/telegram.js';

function sendJson(res, code, payload) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(JSON.stringify(payload));
}

async function redisCommand(command) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error('Redis not configured');
  const res = await fetch(`${url}/${command.map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const json = await res.json();
  return json.result;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return sendJson(res, 200, { ok: true });
  if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { name, phone, area, budget, purpose, note, source_page = 'survey.html' } = body;

    if (!name || !phone) {
      return sendJson(res, 400, { ok: false, error: '請填寫姓名與電話' });
    }

    const now = new Date().toISOString();
    const id = `lead_${Date.now()}`;
    const record = JSON.stringify({
      id, name, phone, area, budget, purpose, note,
      source_page, status: 'new', assigned_to: '', admin_note: '',
      created_at: now, updated_at: now
    });

    await redisCommand(['RPUSH', 'tirea:leads', record]);

    try {
      await sendTelegramLeadNotification({ name, phone, area, budget, purpose, note });
    } catch (e) {
      console.error('Telegram error:', e.message);
    }

    return sendJson(res, 200, { ok: true, id });
  } catch (error) {
    return sendJson(res, 500, { ok: false, error: error.message || 'Internal server error' });
  }
}
