async function redisCommand(args) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  const res = await fetch(`${url}/${args.map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.json();
}

function sendJson(res, code, payload) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function isValidToken(token) {
  const superPass = process.env.ADMIN_TOKEN;
  if (!superPass) return false;
  if (token === superPass) return true;
  if (typeof token === 'string' && token.startsWith(superPass + ':')) return true;
  return false;
}

export default async function handler(req, res) {
  const token = req.query?.token || req.headers['x-admin-token'];
  if (!isValidToken(token)) {
    return sendJson(res, 401, { ok: false, error: 'Unauthorized' });
  }

  try {
    const result = await redisCommand(['LRANGE', 'tirea:members', '0', '-1']);
    if (!result || !result.result) {
      return sendJson(res, 200, { ok: true, members: [], note: 'Upstash not connected yet' });
    }

    const members = result.result.map(item => {
      try { return JSON.parse(item); } catch { return { email: item, source: 'unknown', created_at: '' }; }
    }).reverse(); // 最新在前

    return sendJson(res, 200, { ok: true, members });
  } catch (e) {
    return sendJson(res, 500, { ok: false, error: e.message });
  }
}
