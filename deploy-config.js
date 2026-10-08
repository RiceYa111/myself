/* 部署配置：线上版走 Render 中转（国内可直连），Cloudflare Worker 作为兜底节点。
   本地运行（127.0.0.1 / localhost）时留空即可，会自动走本机服务。 */
window.MYSELF_API_BASE='https://myself-relay.onrender.com';
window.MYSELF_API_FALLBACK='https://myself-relay.riceya.workers.dev';
