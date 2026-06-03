const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendMessage(chatId, text, parseMode = 'HTML') {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode })
  });
}

async function redisCall(cmd) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  const res = await fetch(`${url}/${cmd.map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return (await res.json()).result;
}

function sendJson(res, code, payload) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

// 即時回覆（不需要 Claude Code）
async function handleInstant(cmd, chatId) {
  if (cmd === '/狀態' || cmd === '/status') {
    const mc = (await redisCall(['LLEN', 'tirea:members'])) || 0;
    const lc = (await redisCall(['LLEN', 'tirea:leads'])) || 0;
    return `📊 <b>TIREA 網站狀態</b>\n\n🌐 https://tirea-site.vercel.app\n👥 會員：${mc} 人\n📋 問卷：${lc} 筆\n🏠 建案：64 個\n📰 新聞：13 期\n\n✅ 系統正常`;
  }
  if (cmd === '/網址' || cmd === '/url') {
    return `🌐 <b>所有頁面連結</b>\n\n首頁：https://tirea-site.vercel.app\nAI找房：https://tirea-site.vercel.app/ai_butler.html\n海外房源：https://tirea-site.vercel.app/global_pro.html\n投資地圖：https://tirea-site.vercel.app/invest_map.html\n泰國說明會：https://tirea-site.vercel.app/thailand-seminar.html\n新加坡指南：https://tirea-site.vercel.app/singapore-guide.html\n後台管理：https://tirea-site.vercel.app/admin/index.html`;
  }
  if (cmd === '/會員') {
    const raw = await redisCall(['LRANGE', 'tirea:members', '0', '9']);
    const members = (raw || []).map(r => { try { return JSON.parse(r); } catch { return null; } }).filter(Boolean).reverse();
    if (!members.length) return '📭 目前沒有會員資料';
    return `👥 <b>最新 ${Math.min(members.length,5)} 筆會員</b>\n\n` +
      members.slice(0,5).map((m,i) => `${i+1}. ${m.name||'未填'} | ${m.phone||'-'} | LINE: ${m.line_id||'-'}`).join('\n');
  }
  if (cmd === '/問卷') {
    const raw = await redisCall(['LRANGE', 'tirea:leads', '0', '9']);
    const leads = (raw || []).map(r => { try { return JSON.parse(r); } catch { return null; } }).filter(Boolean).reverse();
    if (!leads.length) return '📭 目前沒有問卷資料';
    return `📋 <b>最新 ${Math.min(leads.length,5)} 筆問卷</b>\n\n` +
      leads.slice(0,5).map((l,i) => `${i+1}. ${l.name||'未填'} | ${l.phone||'-'} | ${l.area||'-'} | ${l.status||'new'}`).join('\n');
  }
  if (cmd === '/幫助' || cmd === '/help') {
    return `🤖 <b>TIREA Bot 指令</b>\n\n` +
      `<b>📊 即時查詢（隨時可用）</b>\n` +
      `/狀態 — 網站狀態\n` +
      `/網址 — 所有頁面連結\n` +
      `/會員 — 最新會員名單\n` +
      `/問卷 — 最新問卷名單\n\n` +
      `<b>⚡ 執行指令（Claude Code 開著時）</b>\n` +
      `/部署 — 部署網站到 Vercel\n` +
      `/日報 — 建今天新聞頁\n` +
      `/新增建案 [名稱] — 新增房源\n` +
      `/修改首頁 [說明] — 修改首頁內容\n\n` +
      `執行指令會進入隊列，Claude Code 開著時自動處理 ✅`;
  }
  return null;
}

// 需要 Claude Code 執行的指令 → 存入 Redis 隊列
const QUEUED_COMMANDS = ['/部署', '/日報', '/新增建案', '/修改首頁', '/修改'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 200, { ok: true });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const msg = body?.message;
    if (!msg) return sendJson(res, 200, { ok: true });

    const chatId = msg.chat?.id;
    const text = (msg.text || '').trim();
    const userName = msg.from?.first_name || '用戶';
    const chatType = msg.chat?.type;

    // 儲存群組 Chat ID
    if (chatType === 'group' || chatType === 'supergroup') {
      await redisCall(['SET', 'tirea:group_chat_id', String(chatId)]);
    }

    if (!text.startsWith('/')) return sendJson(res, 200, { ok: true });

    const cmdBase = text.split(' ')[0].toLowerCase();
    const args = text.slice(cmdBase.length).trim();

    // 即時指令
    const instantReply = await handleInstant(cmdBase, chatId);
    if (instantReply) {
      await sendMessage(chatId, instantReply);
      return sendJson(res, 200, { ok: true });
    }

    // 需要隊列的指令
    const isQueued = QUEUED_COMMANDS.some(c => cmdBase === c);
    if (isQueued) {
      const job = JSON.stringify({
        id: `job_${Date.now()}`,
        cmd: cmdBase,
        args,
        chatId: String(chatId),
        userName,
        created_at: new Date().toISOString(),
        status: 'pending'
      });
      await redisCall(['RPUSH', 'tirea:cmd_queue', job]);
      await sendMessage(chatId,
        `⏳ <b>${cmdBase}</b> 已進入隊列\n\nClaude Code 開著時會自動執行，完成後通知你 ✅`
      );
    }

    return sendJson(res, 200, { ok: true });
  } catch (err) {
    console.error('Webhook error:', err.message);
    return sendJson(res, 200, { ok: true });
  }
}
