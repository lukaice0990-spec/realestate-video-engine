// api/admin-activities.js — 近期活動 CRUD
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

const KV_KEY = 'tirea:activities';

async function redisCommand(args) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  const res = await fetch(`${url}/${args.map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.json();
}

async function getActivities() {
  const json = await redisCommand(['GET', KV_KEY]);
  if (!json || !json.result) return [];
  try {
    const data = JSON.parse(json.result);
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

async function saveActivities(activities) {
  await redisCommand(['SET', KV_KEY, JSON.stringify(activities)]);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return sendJson(res, 200, {});

  const token = req.query?.token || req.headers['x-admin-token'];
  const isAdmin = isValidToken(token);

  // ── GET: 列出活動 ──────────────────────────────────────
  if (req.method === 'GET') {
    try {
      let activities = await getActivities();
      if (!isAdmin) {
        activities = activities.filter(a => a.published !== false);
      }
      return sendJson(res, 200, { ok: true, items: activities, count: activities.length });
    } catch (e) {
      return sendJson(res, 500, { ok: false, error: e.message });
    }
  }

  // ── POST: 管理操作（需 admin token） ─────────────────
  if (req.method === 'POST') {
    if (!isAdmin) return sendJson(res, 401, { ok: false, error: 'Unauthorized' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { action } = body;

    try {
      let activities = await getActivities();

      // ── 新增
      if (action === 'add') {
        const { activity } = body;
        if (!activity?.title) return sendJson(res, 400, { ok: false, error: '缺少標題' });
        const item = {
          id: Date.now().toString(),
          title: activity.title,
          date: activity.date || '',
          tag: activity.tag || '活動',
          tagColor: activity.tagColor || 'amber',
          image: activity.image || '',
          link: activity.link || '',
          published: true,
          created_at: new Date().toISOString()
        };
        activities.unshift(item);
        await saveActivities(activities);
        return sendJson(res, 200, { ok: true, message: '活動已新增', activity: item });
      }

      // ── 更新
      if (action === 'update') {
        const { id, activity } = body;
        const idx = activities.findIndex(a => a.id === id);
        if (idx < 0) return sendJson(res, 404, { ok: false, error: '找不到活動' });
        activities[idx] = { ...activities[idx], ...activity, id };
        await saveActivities(activities);
        return sendJson(res, 200, { ok: true, message: '活動已更新' });
      }

      // ── 刪除
      if (action === 'delete') {
        activities = activities.filter(a => a.id !== body.id);
        await saveActivities(activities);
        return sendJson(res, 200, { ok: true, message: '活動已刪除' });
      }

      // ── 上下架
      if (action === 'toggle') {
        const idx = activities.findIndex(a => a.id === body.id);
        if (idx < 0) return sendJson(res, 404, { ok: false, error: '找不到活動' });
        activities[idx].published = !activities[idx].published;
        await saveActivities(activities);
        return sendJson(res, 200, { ok: true, message: activities[idx].published ? '已上架' : '已下架' });
      }

      // ── 預載預設活動 / 重置為最新課程表
      if (action === 'seed' || action === 'reset') {
        const defaults = [
          {
            id: 'act-jp-0531',
            title: '🇯🇵 日本房產投資說明會（第二場）',
            subtitle: '東京・沖繩・福岡中古屋實戰，日圓升值後換匯策略與物件選擇全解析',
            date: '5/31(日)',
            tag: '說明會', tagColor: 'red',
            image: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=800&q=80',
            link: 'https://line.me/R/ti/p/@180phkse', published: true, created_at: new Date().toISOString()
          },
          {
            id: 'act-jp-0529',
            title: '🇯🇵 日本房產投資說明會',
            subtitle: '東京・沖繩・福岡中古屋投資實戰，BOJ 升息後最佳進場時機完整解析',
            date: '5/29(四)',
            tag: '說明會', tagColor: 'red',
            image: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=800&q=80',
            link: 'https://line.me/R/ti/p/@180phkse', published: true, created_at: new Date().toISOString()
          },
          {
            id: 'act-ai-0526',
            title: '🤖 AI 課程・智慧置產新工具',
            subtitle: 'AI 輔助看盤、數據分析、市場報告生成，下一代置產方法論實戰教學',
            date: '5/26(二)',
            tag: '課程', tagColor: 'violet',
            image: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?auto=format&fit=crop&w=800&q=80',
            link: 'https://line.me/R/ti/p/@180phkse', published: true, created_at: new Date().toISOString()
          },
          {
            id: 'act-my-jb-0523',
            title: '🇲🇾 馬來西亞新山投資說明會',
            subtitle: '新柔捷運沿線熱點物件・MM2H 長居計畫・跨境生活圈投資機會',
            date: '5/23(六)',
            tag: '說明會', tagColor: 'emerald',
            image: 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=800&q=80',
            link: 'https://line.me/R/ti/p/@180phkse', published: true, created_at: new Date().toISOString()
          },
          {
            id: 'act-diy-0523',
            title: '自助買房全攻略說明會（第二場）',
            subtitle: '從選物件、看合約到完成海外過戶，全流程實戰教學',
            date: '5/23(六)',
            tag: '說明會', tagColor: 'blue',
            image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80',
            link: 'https://line.me/R/ti/p/@180phkse', published: true, created_at: new Date().toISOString()
          },
          {
            id: 'act-live-0519',
            title: '🎥 Kevin & Luke 協會聯合直播',
            subtitle: '日本・泰國・馬來西亞最新市場動態直播分析，投資人必看',
            date: '5/19(一)',
            tag: '直播', tagColor: 'violet',
            image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=800&q=80',
            link: 'https://line.me/R/ti/p/@180phkse', published: true, created_at: new Date().toISOString()
          },
          {
            id: 'act-diy-0512',
            title: '自助買房全攻略說明會',
            subtitle: '從選物件、看合約到完成海外過戶，全流程實戰教學，現場 Q&A',
            date: '5/12(二)',
            tag: '說明會', tagColor: 'blue',
            image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80',
            link: 'https://line.me/R/ti/p/@180phkse', published: true, created_at: new Date().toISOString()
          },
          {
            id: 'act-bkk-0519',
            title: '🇹🇭 曼谷 4 天 3 夜投資考察團',
            subtitle: '實地看屋 × 直接對話開發商 × 全程中文顧問陪同',
            date: '5/19(二)–22(五)｜名額有限',
            tag: '考察團', tagColor: 'red',
            image: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=800&q=80',
            link: '/thailand-seminar.html', published: true, created_at: new Date().toISOString()
          },
          {
            id: 'act-phone-0422',
            title: '手機講師課程',
            subtitle: '一支手機打造房產自媒體，拍影片・做直播・吸引潛在客戶',
            date: '4/22(五)',
            tag: '課程', tagColor: 'amber',
            image: 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&w=800&q=80',
            link: 'https://line.me/R/ti/p/@180phkse', published: true, created_at: new Date().toISOString()
          },
          {
            id: 'act-meeting-0422',
            title: 'TIREA 4 月協會例會',
            subtitle: '市場最新動態分享・政策解讀・會員互動交流',
            date: '4/22(二)',
            tag: '例會', tagColor: 'violet',
            image: 'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?auto=format&fit=crop&w=800&q=80',
            link: 'https://line.me/R/ti/p/@180phkse', published: true, created_at: new Date().toISOString()
          },
        ];
        if (action === 'reset') {
          // 完整替換
          await saveActivities(defaults);
          return sendJson(res, 200, { ok: true, message: `已重置為 ${defaults.length} 筆活動` });
        }
        // seed：只補缺少的
        const existingIds = new Set(activities.map(a => a.id));
        const toAdd = defaults.filter(a => !existingIds.has(a.id));
        activities = [...toAdd, ...activities];
        await saveActivities(activities);
        return sendJson(res, 200, { ok: true, message: `已預載 ${toAdd.length} 筆活動`, count: activities.length });
      }

      return sendJson(res, 400, { ok: false, error: `未知操作: ${action}` });
    } catch (e) {
      return sendJson(res, 500, { ok: false, error: e.message });
    }
  }

  return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
}
