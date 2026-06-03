// Dcard 公開貼文爬蟲
// 使用 Dcard 公開搜尋 API

const SEARCH_QUERIES = [
  '海外買房', '海外投資', '海外置產',
  '泰國買房', '泰國投資', '馬來西亞買房',
  '日本買房', '收租', '移民置產',
];

export async function fetchDcardPosts() {
  const seen = new Set();
  const results = [];

  for (const query of SEARCH_QUERIES) {
    try {
      const posts = await searchDcard(query);
      for (const post of posts) {
        if (!seen.has(post.post_id)) {
          seen.add(post.post_id);
          results.push(post);
        }
      }
    } catch (err) {
      console.error(`[Dcard] search "${query}" error:`, err.message);
    }
  }

  return results;
}

async function searchDcard(query) {
  const url = `https://www.dcard.tw/service/api/v2/search/posts?query=${encodeURIComponent(query)}&limit=20`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      Accept: 'application/json',
    },
  });

  if (!res.ok) return [];

  const data = await res.json();
  if (!Array.isArray(data)) return [];

  return data.map(post => ({
    platform: 'Dcard',
    post_id: `dcard:${post.id}`,
    author: post.school || post.department || null,
    title: post.title || '',
    content: `${post.title || ''}\n${post.excerpt || ''}`.trim(),
    url: `https://www.dcard.tw/f/${post.forumAlias}/p/${post.id}`,
    search_query: query,
  }));
}
