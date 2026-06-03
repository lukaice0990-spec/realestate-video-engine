// api/admin-articles.js — 文章管理 CRUD（兼 maps-config）
function sendJson(res, code, payload) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(JSON.stringify(payload));
}

function isValidToken(token) {
  const superPass = process.env.ADMIN_TOKEN;
  if (!superPass) return false;
  if (token === superPass) return true;
  if (typeof token === 'string' && token.startsWith(superPass + ':')) return true;
  return false;
}

const KV_KEY = 'tirea:articles';

// Use URL-path format (same as admin-members.js which works correctly)
async function redisCommand(args) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  const res = await fetch(`${url}/${args.map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.json();
}

async function getArticles() {
  const json = await redisCommand(['GET', KV_KEY]);
  if (!json || !json.result) return [];
  try {
    const data = JSON.parse(json.result);
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

async function saveArticles(articles) {
  await redisCommand(['SET', KV_KEY, JSON.stringify(articles)]);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return sendJson(res, 200, {});

  const token = req.query?.token || req.headers['x-admin-token'];
  const isAdmin = isValidToken(token);

  // ── maps-config 相容路由 ──────────────────────────────
  if (req.query?.maps === '1') {
    return sendJson(res, 200, { ok: true, googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '' });
  }

  // ── GET: 列出文章 ──────────────────────────────────────
  if (req.method === 'GET') {
    try {
      let articles = await getArticles();
      // 非管理員只看已發佈
      if (!isAdmin) {
        articles = articles.filter(a => a.published === true);
      }
      return sendJson(res, 200, { ok: true, items: articles, count: articles.length });
    } catch (e) {
      return sendJson(res, 500, { ok: false, error: e.message });
    }
  }

  // ── POST: 管理操作（需 admin token） ───────────────────
  if (req.method === 'POST') {
    if (!isAdmin) return sendJson(res, 401, { ok: false, error: 'Unauthorized' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { action } = body;

    try {
      let articles = await getArticles();

      // ── 新增文章
      if (action === 'add') {
        const { article } = body;
        if (!article || !article.title) return sendJson(res, 400, { ok: false, error: '缺少標題' });
        const newArticle = {
          id: Date.now().toString(),
          title: article.title,
          description: article.description || '',
          fileUrl: article.fileUrl || '',
          emoji: article.emoji || '📄',
          published: false,
          created_at: new Date().toISOString(),
          published_at: null
        };
        articles.unshift(newArticle);
        await saveArticles(articles);
        return sendJson(res, 200, { ok: true, message: '文章已新增', article: newArticle });
      }

      // ── 更新文章
      if (action === 'update') {
        const { id, article } = body;
        const idx = articles.findIndex(a => a.id === id);
        if (idx < 0) return sendJson(res, 404, { ok: false, error: '找不到文章' });
        articles[idx] = { ...articles[idx], ...article, id };
        await saveArticles(articles);
        return sendJson(res, 200, { ok: true, message: '文章已更新' });
      }

      // ── 刪除文章
      if (action === 'delete') {
        const { id } = body;
        articles = articles.filter(a => a.id !== id);
        await saveArticles(articles);
        return sendJson(res, 200, { ok: true, message: '文章已刪除' });
      }

      // ── 發布 / 取消發布文章（發送給全體會員）
      if (action === 'publish') {
        const { id, published } = body;
        const idx = articles.findIndex(a => a.id === id);
        if (idx < 0) return sendJson(res, 404, { ok: false, error: '找不到文章' });
        articles[idx].published = published !== false;
        articles[idx].published_at = articles[idx].published ? new Date().toISOString() : null;
        await saveArticles(articles);
        const msg = articles[idx].published ? '已發送給全體會員' : '已取消發布';
        return sendJson(res, 200, { ok: true, message: msg });
      }

      // ── 清除舊資料並重新種入3篇預設報告
      if (action === 'seed') {
        const defaults = [
          {
            id: 'default-1',
            title: '🇹🇭 2026 曼谷投資市場報告',
            description: '深度分析曼谷4大投資熱區、捷運沿線建案、租金報酬率與外籍買家法規。',
            fileUrl: '/public_reports/tirea-bangkok-2026.pdf',
            emoji: '🇹🇭',
            published: true,
            created_at: new Date().toISOString(),
            published_at: new Date().toISOString()
          },
          {
            id: 'default-2',
            title: '🌏 海外置產入門完整指南',
            description: '6大市場橫向比較、選市邏輯、法規稅務、匯款流程與常見陷阱完整說明。',
            fileUrl: '/public_reports/tirea-overseas-guide.pdf',
            emoji: '🌏',
            published: true,
            created_at: new Date().toISOString(),
            published_at: new Date().toISOString()
          },
          {
            id: 'default-3',
            title: '🇦🇪 杜拜 Freehold 市場概覽',
            description: '零稅率優勢、永久產權規則、黃金簽證門檻、熱門區域與成本結構完整解析。',
            fileUrl: '/public_reports/tirea-dubai-freehold.pdf',
            emoji: '🇦🇪',
            published: true,
            created_at: new Date().toISOString(),
            published_at: new Date().toISOString()
          }
        ];
        // Filter out existing default IDs to avoid duplicates
        const existingIds = new Set(articles.map(a => a.id));
        const toAdd = defaults.filter(a => !existingIds.has(a.id));
        articles = [...articles, ...toAdd];
        await saveArticles(articles);
        return sendJson(res, 200, { ok: true, message: `已預載 ${toAdd.length} 篇報告`, count: articles.length });
      }

      // ── 清除所有文章（用於重置測試資料）
      if (action === 'reset') {
        await redisCommand(['DEL', KV_KEY]);
        return sendJson(res, 200, { ok: true, message: '已清除所有文章' });
      }

      return sendJson(res, 400, { ok: false, error: `未知操作: ${action}` });
    } catch (e) {
      return sendJson(res, 500, { ok: false, error: e.message });
    }
  }

  return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
}
