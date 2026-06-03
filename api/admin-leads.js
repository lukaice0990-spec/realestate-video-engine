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
  const json = await res.json();
  return json.result;
}

function isValidToken(token) {
  const superPass = process.env.ADMIN_TOKEN;
  if (!superPass) return false;
  if (token === superPass) return true;
  // 一般管理員 token 格式: superPass:username
  if (typeof token === 'string' && token.startsWith(superPass + ':')) return true;
  return false;
}

export default async function handler(req, res) {
  const token = req.query?.token || req.headers['x-admin-token'];
  if (!isValidToken(token)) {
    return sendJson(res, 401, { ok: false, error: 'Unauthorized' });
  }

  // POST → 更新 lead
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const { id, status, assigned_to, admin_note } = body;
      if (!id) return sendJson(res, 400, { ok: false, error: 'Missing lead id' });

      const raw = await redisCommand(['LRANGE', 'tirea:leads', '0', '199']);
      const leads = (raw || []).map(r => { try { return JSON.parse(r); } catch { return null; } }).filter(Boolean);

      const idx = leads.findIndex(l => l.id === id);
      if (idx === -1) return sendJson(res, 404, { ok: false, error: 'Lead not found' });

      const updated = {
        ...leads[idx],
        ...(status !== undefined && { status }),
        ...(assigned_to !== undefined && { assigned_to }),
        ...(admin_note !== undefined && { admin_note }),
        updated_at: new Date().toISOString()
      };
      await redisCommand(['LSET', 'tirea:leads', String(idx), JSON.stringify(updated)]);
      return sendJson(res, 200, { ok: true, lead: updated });
    } catch (error) {
      return sendJson(res, 500, { ok: false, error: error.message || 'Internal server error' });
    }
  }

  // GET → 列出 leads
  try {
    const raw = await redisCommand(['LRANGE', 'tirea:leads', '0', '199']);
    const leads = (raw || [])
      .map(r => { try { return JSON.parse(r); } catch { return null; } })
      .filter(Boolean)
      .reverse();

    const statusFilter = req.query?.status;
    const areaFilter = req.query?.area;
    const filtered = leads.filter(l => {
      if (statusFilter && l.status !== statusFilter) return false;
      if (areaFilter && l.area !== areaFilter) return false;
      return true;
    });

    return sendJson(res, 200, { ok: true, leads: filtered });
  } catch (error) {
    return sendJson(res, 500, { ok: false, error: error.message || 'Internal server error' });
  }
}
