// PTT 公開貼文爬蟲
// 監控看板：房地產板（RealEstate）
// 使用 PTT 搜尋功能，無需登入

const BOARD = 'home-sale'; // PTT 房屋買賣板（RealEstate 板不存在）

const SEARCH_QUERIES = [
  '海外買房', '海外投資', '海外置產', '海外房產',
  '泰國買房', '泰國投資', '馬來西亞買房', '日本買房',
  '移民置產', '收租報酬', '曼谷', '吉隆坡',
];

export async function fetchPttPosts() {
  const seen = new Set();
  const results = [];

  for (const query of SEARCH_QUERIES) {
    try {
      const posts = await searchPtt(BOARD, query);
      for (const post of posts) {
        if (!seen.has(post.post_id)) {
          seen.add(post.post_id);
          results.push(post);
        }
      }
    } catch (err) {
      console.error(`[PTT] search "${query}" error:`, err.message);
    }
  }

  return results;
}

async function searchPtt(board, query) {
  const url = `https://www.ptt.cc/bbs/${board}/search?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      Cookie: 'over18=1',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
  });

  if (!res.ok) return [];

  const html = await res.text();
  return parsePttSearchResults(html, query);
}

function parsePttSearchResults(html, query) {
  const posts = [];

  // 取出每個文章列表項目
  const rowRegex = /<div class="r-ent">([\s\S]*?)<\/div>\s*<\/div>/g;
  let match;

  while ((match = rowRegex.exec(html)) !== null) {
    const block = match[1];

    // 取標題連結
    const linkMatch = block.match(/<a href="(\/bbs\/[^"]+\.html)"[^>]*>([^<]+)<\/a>/);
    if (!linkMatch) continue;

    const path = linkMatch[1];
    const title = linkMatch[2].replace(/&amp;/g, '&').trim();

    // 取作者
    const authorMatch = block.match(/<div class="author">([^<]+)<\/div>/);
    const author = authorMatch ? authorMatch[1].trim() : null;

    posts.push({
      platform: 'PTT',
      post_id: `ptt:${path}`,
      author,
      title,
      content: title, // 清單頁只有標題，以標題作為 content 供 AI 分析
      url: `https://www.ptt.cc${path}`,
      search_query: query,
    });
  }

  return posts;
}
