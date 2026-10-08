/* Myself Agent 中转服务 · Render 版
   复用 deploy/worker.js 的全部业务逻辑（规则、人设、校验、限流、埋点），
   仅替换运行环境：Cloudflare Workers → 普通 Node 服务。
   KV 用本地 JSON 文件实现（重启保留；Render 重新部署会重置，属可接受范围）。 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { default: worker } = await import('./worker.js');

// ---- KV 存储（接口对齐 Cloudflare KV：get / put(key, value, {expirationTtl})）----
// 优先 Upstash Redis（免费、持久，Render 休眠不丢数据）；未配置则退化为本地 JSON 文件
const UP_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const UP_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';
let KV;
if (UP_URL && UP_TOKEN) {
  const call = async (cmd) => {
    const r = await fetch(UP_URL, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + UP_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify(cmd),
    });
    return (await r.json()).result ?? null;
  };
  KV = {
    async get(key) { return call(['GET', key]); },
    async put(key, value, opts = {}) {
      await call(opts.expirationTtl ? ['SET', key, String(value), 'EX', opts.expirationTtl] : ['SET', key, String(value)]);
    },
  };
  console.log('KV: Upstash Redis（持久）');
} else {
  const KV_FILE = process.env.KV_FILE || path.join(__dirname, 'kv-store.json');
  let store = {};
  try { store = JSON.parse(fs.readFileSync(KV_FILE, 'utf8')); } catch { store = {}; }
  let saveTimer = null;
  const saveSoon = () => {
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
      saveTimer = null;
      try { fs.writeFileSync(KV_FILE, JSON.stringify(store)); } catch {}
    }, 500);
  };
  KV = {
    async get(key) {
      const e = store[key];
      if (!e) return null;
      if (e.exp && e.exp < Date.now()) { delete store[key]; saveSoon(); return null; }
      return e.v;
    },
    async put(key, value, opts = {}) {
      store[key] = { v: String(value), exp: opts.expirationTtl ? Date.now() + opts.expirationTtl * 1000 : 0 };
      saveSoon();
    },
  };
  console.log('KV: 本地文件（重新部署后重置，建议配置 Upstash）');
}

const env = {
  DEEPSEEK_KEY: process.env.DEEPSEEK_KEY || '',
  BASE_URL: process.env.BASE_URL || '',
  MODEL: process.env.MODEL || '',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || 'https://myself-9az.pages.dev',
  GLOBAL_DAILY: process.env.GLOBAL_DAILY || '500',
  PER_IP_DAILY: process.env.PER_IP_DAILY || '30',
  STATS_TOKEN: process.env.STATS_TOKEN || '',
  MYSELF_KV: KV,
};
const ctx = { waitUntil(p) { Promise.resolve(p).catch(() => {}); }, passThroughOnException() {} };

const server = http.createServer(async (req, res) => {
  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = Buffer.concat(chunks);
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
    // Render 反向代理：把真实访客 IP 映射为 Worker 代码读取的 CF-Connecting-IP，
    // 否则所有访客共用 unknown 一个限流桶（30 条/天就会被一起卡死）
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    if (ip) headers.set('CF-Connecting-IP', ip);
    const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
    const request = new Request(url, {
      method: req.method,
      headers,
      body: body.length && !/^(GET|HEAD)$/.test(req.method) ? body : undefined,
    });
    const response = await worker.fetch(request, env, ctx);
    res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: '服务内部错误，请重试。', code: 'INTERNAL' }));
  }
});

const port = Number(process.env.PORT) || 10000;
server.listen(port, () => console.log('myself-relay (Render) listening on :' + port));
