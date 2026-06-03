// api/admin-projects.js — 建案 CRUD 管理
import fs from 'fs';
import path from 'path';

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

const KV_KEY = 'tirea:projects';

async function getProjects() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  const res = await fetch(`${url}/get/${encodeURIComponent(KV_KEY)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const json = await res.json();
  if (!json.result) return null;
  try { return JSON.parse(json.result); } catch { return null; }
}

async function saveProjects(projects) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error('Redis not configured');
  await fetch(`${url}/set/${encodeURIComponent(KV_KEY)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([JSON.stringify(projects)])
  });
}

function loadFromJsonFile() {
  try {
    const filePath = path.join(process.cwd(), 'data_mygo_international_all.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return (data.items || []).map(p => ({
      ...p,
      status: p.status || 'active',
      created_at: p.created_at || new Date().toISOString()
    }));
  } catch { return []; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return sendJson(res, 200, {});

  const token = req.query?.token || req.headers['x-admin-token'];
  const isAdmin = isValidToken(token);

  // ── GET: 列出建案 ──────────────────────────────────────
  if (req.method === 'GET') {
    try {
      let projects = await getProjects();
      // 若 Redis 為空，fallback 讀 JSON 檔
      if (!projects || projects.length === 0) {
        projects = loadFromJsonFile();
      }
      // 非管理員只看 active
      if (!isAdmin) {
        projects = projects.filter(p => p.status !== 'hidden');
      }
      return sendJson(res, 200, { ok: true, items: projects, count: projects.length });
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
      let projects = await getProjects() || [];

      // ── 匯入 JSON 檔案
      if (action === 'seed') {
        const fromFile = loadFromJsonFile();
        if (fromFile.length === 0) return sendJson(res, 400, { ok: false, error: 'JSON 檔案不存在或為空' });
        const existingIds = new Set(projects.map(p => p.id));
        const toAdd = fromFile
          .filter(p => !existingIds.has(p.id))
          .map(p => ({ ...p, status: 'active', created_at: new Date().toISOString() }));
        projects = [...projects, ...toAdd];
        await saveProjects(projects);
        return sendJson(res, 200, { ok: true, message: `匯入完成，新增 ${toAdd.length} 筆`, count: projects.length });
      }

      // ── 新增建案
      if (action === 'add') {
        const { project } = body;
        if (!project || !project.title) return sendJson(res, 400, { ok: false, error: '缺少 title' });
        if (!project.id) {
          project.id = 'proj-' + Date.now();
        }
        // 確保 id 唯一
        if (projects.find(p => p.id === project.id)) {
          project.id = project.id + '-' + Math.random().toString(36).slice(2,6);
        }
        project.status = project.status || 'active';
        project.created_at = new Date().toISOString();
        if (Array.isArray(project.highlights_raw)) {
          project.highlights = project.highlights_raw.filter(Boolean);
          delete project.highlights_raw;
        }
        projects.push(project);
        await saveProjects(projects);
        return sendJson(res, 200, { ok: true, project });
      }

      // ── 更新建案
      if (action === 'update') {
        const { project } = body;
        if (!project || !project.id) return sendJson(res, 400, { ok: false, error: '缺少 id' });
        const idx = projects.findIndex(p => p.id === project.id);
        if (idx === -1) return sendJson(res, 404, { ok: false, error: '找不到建案' });
        if (Array.isArray(project.highlights_raw)) {
          project.highlights = project.highlights_raw.filter(Boolean);
          delete project.highlights_raw;
        }
        projects[idx] = { ...projects[idx], ...project, updated_at: new Date().toISOString() };
        await saveProjects(projects);
        return sendJson(res, 200, { ok: true, project: projects[idx] });
      }

      // ── 刪除建案
      if (action === 'delete') {
        const { id } = body;
        if (!id) return sendJson(res, 400, { ok: false, error: '缺少 id' });
        const before = projects.length;
        projects = projects.filter(p => p.id !== id);
        if (projects.length === before) return sendJson(res, 404, { ok: false, error: '找不到建案' });
        await saveProjects(projects);
        return sendJson(res, 200, { ok: true, message: '已刪除' });
      }

      // ── 切換顯示狀態
      if (action === 'toggle') {
        const { id } = body;
        if (!id) return sendJson(res, 400, { ok: false, error: '缺少 id' });
        const idx = projects.findIndex(p => p.id === id);
        if (idx === -1) return sendJson(res, 404, { ok: false, error: '找不到建案' });
        projects[idx].status = projects[idx].status === 'hidden' ? 'active' : 'hidden';
        projects[idx].updated_at = new Date().toISOString();
        await saveProjects(projects);
        return sendJson(res, 200, { ok: true, status: projects[idx].status });
      }

      // ── 調整排序（上移/下移）
      if (action === 'reorder') {
        const { id, direction } = body;
        const idx = projects.findIndex(p => p.id === id);
        if (idx === -1) return sendJson(res, 404, { ok: false, error: '找不到建案' });
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= projects.length) return sendJson(res, 400, { ok: false, error: '無法移動' });
        [projects[idx], projects[swapIdx]] = [projects[swapIdx], projects[idx]];
        await saveProjects(projects);
        return sendJson(res, 200, { ok: true });
      }

      return sendJson(res, 400, { ok: false, error: '未知操作' });
    } catch (e) {
      return sendJson(res, 500, { ok: false, error: e.message });
    }
  }

  return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
}
