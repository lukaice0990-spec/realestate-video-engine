async function redisCommand(args) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  const res = await fetch(`${url}/${args.map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.json();
}

async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  }).catch(() => {});
}

function sendJson(res, code, payload) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(JSON.stringify(payload));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return sendJson(res, 405, { ok: false });

  const { name, phone, line_id, email, budget, purpose, markets = [], ref_source, source = 'member_center' } = req.body || {};
  if (!email) return sendJson(res, 400, { ok: false, error: 'Email required' });

  const now = new Date().toISOString();
  const record = JSON.stringify({ name, phone, line_id, email, budget, purpose, markets, ref_source, source, created_at: now });

  // 存入 Redis
  await redisCommand(['RPUSH', 'tirea:members', record]);

  // Telegram 通知
  const twTime = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
  const marketStr = markets.length ? markets.join('、') : '未填寫';
  await sendTelegram(
    `🆕 <b>新會員註冊</b>\n\n` +
    `👤 ${name || '未填寫'}\n` +
    `📱 ${phone || '未填寫'}\n` +
    `💚 LINE：${line_id || '未填寫'}\n` +
    `📧 ${email}\n` +
    `💰 預算：${budget || '未填寫'}\n` +
    `🎯 目的：${purpose || '未填寫'}\n` +
    `🌏 市場：${marketStr}\n` +
    `📣 來源：${ref_source || '未填寫'}\n` +
    `🕐 ${twTime}`
  );

  return sendJson(res, 200, { ok: true });
}
