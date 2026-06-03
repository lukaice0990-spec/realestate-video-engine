async function telegramSend(text) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) return { skipped: true };

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram notify failed: ${body}`);
  }

  return { ok: true };
}

// 社群監控高意向潛在客戶通知
export async function sendTelegramMonitorAlert(lead) {
  const scoreEmoji = lead.intent_score >= 9 ? '🔥' : '⚡';
  const lines = [
    `${scoreEmoji} 高意向潛在客戶（${lead.intent_score}/10）`,
    '',
    `平台：${lead.platform}`,
    lead.author ? `用戶：${lead.author}` : null,
    `內容：${(lead.content || '').slice(0, 150)}`,
    '',
    `原因：${lead.intent_reason || '-'}`,
    '',
    '💬 建議回覆：',
    lead.suggested_reply || '-',
    '',
    lead.url ? `🔗 ${lead.url}` : null,
  ].filter(Boolean).join('\n');

  return telegramSend(lines);
}

// 原有問卷名單通知
export async function sendTelegramLeadNotification(lead) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) return { skipped: true };

  const lines = [
    '🆕 TIREA 新問卷名單',
    `姓名：${lead.name || '-'}`,
    `電話：${lead.phone || '-'}`,
    `區域：${lead.area || '-'}`,
    `預算：${lead.budget || '-'}`,
    `目的：${lead.purpose || '-'}`,
    `備註：${lead.note || '-'}`,
    `來源：${lead.source_page || 'survey.html'}`
  ];

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: lines.join('\n')
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Telegram notify failed: ${text}`);
  }

  return { ok: true };
}
