function sendJson(res, code, payload) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

async function redisCommand(command) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error('Redis not configured');
  const res = await fetch(`${url}/${command.map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return (await res.json()).result;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'Method not allowed' });

  const { username, password } = req.body || {};
  if (!username || !password) return sendJson(res, 400, { ok: false, error: '請輸入帳號與密碼' });

  const superUser = process.env.ADMIN_USERNAME || 'admin';
  const superPass = process.env.ADMIN_TOKEN;
  if (!superPass) return sendJson(res, 500, { ok: false, error: 'Server not configured' });

  // 1. 超級管理員 (env var)
  if (username === superUser && password === superPass) {
    return sendJson(res, 200, { ok: true, token: superPass, role: 'superadmin', username });
  }

  // 2. 一般管理員 — 存在 Redis tirea:admin_users hash
  try {
    const raw = await redisCommand(['HGET', 'tirea:admin_users', username]);
    if (!raw) return sendJson(res, 401, { ok: false, error: '帳號或密碼錯誤' });
    const user = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (user.password !== password) return sendJson(res, 401, { ok: false, error: '帳號或密碼錯誤' });
    const token = `${superPass}:${username}`;
    return sendJson(res, 200, { ok: true, token, role: user.role || 'admin', username });
  } catch (e) {
    return sendJson(res, 500, { ok: false, error: '伺服器錯誤' });
  }
}
