// Gemini AI 意向分析（免費額度：每分鐘 15 次，每天 1500 次）

export async function analyzeIntent(post) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

  const prompt = `你是海外不動產投資顧問助手。分析以下社群貼文，判斷發文者是否有購買海外房產的意向。

平台：${post.platform}
標題：${post.title || ''}
內容：${post.content || ''}

請用 JSON 格式回覆（只輸出 JSON，不加其他文字）：
{
  "score": <1-10 整數>,
  "reason": "<給分原因，40字以內>",
  "reply": "<建議業務員的回覆話術，80字以內，繁體中文，自然友善>"
}

評分標準：
8-10：明確想買海外房、有預算、詢問市場或建商 → 立即聯繫
5-7 ：對海外投資有興趣、比較選項、詢問資訊 → 可跟進
1-4 ：純討論新聞、分享資訊、無購買意圖 → 忽略`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 2048, temperature: 0.3, responseMimeType: 'application/json' },
      }),
    }
  );

  if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '{}';

  try {
    const clean = text.replace(/^```json?\s*/i, '').replace(/\s*```$/, '');
    return JSON.parse(clean);
  } catch {
    console.error('[AI] parse error, raw:', text);
    return { score: 0, reason: 'parse error', reply: '' };
  }
}
