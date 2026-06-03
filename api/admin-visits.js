// api/admin-visits.js — 後台查詢訪客流量資料
function isValidToken(token) {
  const superPass = process.env.ADMIN_TOKEN;
  if (!superPass) return false;
  if (token === superPass) return true;
  if (typeof token === 'string' && token.startsWith(superPass + ':')) return true;
  return false;
}

export default async function handler(req, res) {
  const token = req.query.token || req.headers['x-admin-token'];
  if (!isValidToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const KV_URL = process.env.KV_REST_API_URL;
  const KV_TOKEN = process.env.KV_REST_API_TOKEN;

  try {
    const headers = { Authorization: `Bearer ${KV_TOKEN}` };

    // Get last 500 visits
    const visitsKey = encodeURIComponent('tirea:visits');
    const visitsRes = await fetch(`${KV_URL}/lrange/${visitsKey}/-500/-1`, { headers });
    const visitsJson = await visitsRes.json();
    const rawVisits = (visitsJson.result || []).reverse(); // newest first

    const visits = rawVisits.map(v => {
      try { return JSON.parse(v); } catch { return null; }
    }).filter(Boolean);

    // Daily counts for last 14 days (parallel fetches)
    const today = new Date();
    const dateStrings = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (13 - i));
      return d.toISOString().slice(0, 10);
    });
    const dayResults = await Promise.all(
      dateStrings.map(dateStr => {
        const dayKey = encodeURIComponent(`tirea:visits:${dateStr}`);
        return fetch(`${KV_URL}/get/${dayKey}`, { headers }).then(r => r.json());
      })
    );
    const dailyCounts = dateStrings.map((dateStr, i) => ({
      date: dateStr,
      count: parseInt(dayResults[i].result || 0),
    }));

    // Top pages
    const pageCounts = {};
    visits.forEach(v => {
      const p = v.page || '/';
      pageCounts[p] = (pageCounts[p] || 0) + 1;
    });
    const topPages = Object.entries(pageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([page, count]) => ({ page, count }));

    // Device breakdown
    const deviceCounts = { mobile: 0, desktop: 0, tablet: 0 };
    visits.forEach(v => {
      deviceCounts[v.device] = (deviceCounts[v.device] || 0) + 1;
    });

    // Referrer sources
    const refCounts = {};
    visits.forEach(v => {
      const r = v.ref || 'direct';
      refCounts[r] = (refCounts[r] || 0) + 1;
    });
    const topRefs = Object.entries(refCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([ref, count]) => ({ ref, count }));

    // Stats
    const todayStr = today.toISOString().slice(0, 10);
    const todayVisits = dailyCounts.find(d => d.date === todayStr)?.count || 0;
    const weekVisits = dailyCounts.slice(-7).reduce((s, d) => s + d.count, 0);
    const totalVisits = visits.length;

    return res.status(200).json({
      ok: true,
      stats: { today: todayVisits, week: weekVisits, total: totalVisits },
      visits: visits.slice(0, 200),
      dailyCounts,
      topPages,
      deviceCounts,
      topRefs,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
