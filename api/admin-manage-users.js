// 管理後台使用者帳號 (只有 superadmin 可操作)
// GET  ?token=xxx           → 列出所有管理員
// POST { action:'add', username, password, role }   → 新增
// POST { action:'delete', username }                → 刪除
// POST { action:'reset', username, password }       → 重設密碼

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

function isSuperAdmin(token) {
  const superPass = process.env.ADMIN_TOKEN;
  if (!superPass) return false;
  // superadmin token = superPass 本身
  return token === superPass;
}

export default async function handler(req, res) {
  const token = req.query?.token || req.headers['x-admin-token'];
  if (!isSuperAdmin(token)) {
    return sendJson(res, 401, { ok: false, error: '只有超級管理員可管理帳號' });
  }

  if (req.method === 'GET') {
    // 列出所有管理員
    try {
      const raw = await redisCommand(['HGETALL', 'tirea:admin_users']);
      const users = [];
      if (raw && Array.isArray(raw)) {
        for (let i = 0; i < raw.length; i += 2) {
          const uname = raw[i];
          const udata = typeof raw[i + 1] === 'string' ? JSON.parse(raw[i + 1]) : raw[i + 1];
          users.push({
            username: uname,
            role: udata.role || 'admin',
            created_at: udata.created_at || null
          });
        }
      }
      return sendJson(res, 200, { ok: true, users });
    } catch (e) {
      return sendJson(res, 500, { ok: false, error: e.message });
    }
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { action, username, password, role } = body;

    if (!action) return sendJson(res, 400, { ok: false, error: 'Missing action' });

    const superUser = process.env.ADMIN_USERNAME || 'admin';

    if (action === 'add') {
      if (!username || !password) return sendJson(res, 400, { ok: false, error: '請填寫帳號與密碼' });
      if (username === superUser) return sendJson(res, 400, { ok: false, error: '不能使用超級管理員帳號名稱' });
      if (username.length < 3) return sendJson(res, 400, { ok: false, error: '帳號至少 3 個字元' });
      if (password.length < 6) return sendJson(res, 400, { ok: false, error: '密碼至少 6 個字元' });

      const userObj = {
        password,
        role: role === 'superadmin' ? 'admin' : (role || 'admin'), // 不允許透過這裡設 superadmin
        created_at: new Date().toISOString()
      };
      await redisCommand(['HSET', 'tirea:admin_users', username, JSON.stringify(userObj)]);
      return sendJson(res, 200, { ok: true, message: `已新增管理員 ${username}` });
    }

    if (action === 'delete') {
      if (!username) return sendJson(res, 400, { ok: false, error: 'Missing username' });
      if (username === superUser) return sendJson(res, 400, { ok: false, error: '不能刪除超級管理員' });
      await redisCommand(['HDEL', 'tirea:admin_users', username]);
      return sendJson(res, 200, { ok: true, message: `已刪除管理員 ${username}` });
    }

    if (action === 'reset') {
      if (!username || !password) return sendJson(res, 400, { ok: false, error: '請填寫帳號與新密碼' });
      if (password.length < 6) return sendJson(res, 400, { ok: false, error: '密碼至少 6 個字元' });
      const raw = await redisCommand(['HGET', 'tirea:admin_users', username]);
      if (!raw) return sendJson(res, 404, { ok: false, error: '找不到此帳號' });
      const user = typeof raw === 'string' ? JSON.parse(raw) : raw;
      user.password = password;
      user.updated_at = new Date().toISOString();
      await redisCommand(['HSET', 'tirea:admin_users', username, JSON.stringify(user)]);
      return sendJson(res, 200, { ok: true, message: `已重設 ${username} 的密碼` });
    }

    return sendJson(res, 400, { ok: false, error: 'Unknown action' });
  }

  return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
}
