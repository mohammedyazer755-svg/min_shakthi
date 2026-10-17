import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../apps/web/dist');
const screenshotsDir = path.resolve(__dirname, '../docs/evidence/screenshots');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Find Chrome or Edge
const candidates = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const browserPath = candidates.find(c => fs.existsSync(c));
if (!browserPath) {
  console.error('[SCREENSHOT] No browser executable found');
  process.exit(1);
}
console.log(`[SCREENSHOT] Using browser: ${browserPath}`);

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  let filePath = path.join(distDir, urlPath === '/' ? 'index.html' : urlPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(distDir, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime });
  fs.createReadStream(filePath).pipe(res);
});

function captureAsync(browser, args) {
  return new Promise((resolve) => {
    const child = spawn(browser, args, { stdio: 'ignore' });
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve({ timedOut: true });
    }, 15000);

    child.on('exit', (code) => {
      clearTimeout(timer);
      resolve({ code });
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ err });
    });
  });
}

const PORT = 4174;
server.listen(PORT, '127.0.0.1', async () => {
  console.log(`[SCREENSHOT] Static server running on http://127.0.0.1:${PORT}`);

  const targets = [
    {
      name: 'phase2-overview-desktop.png',
      url: `http://127.0.0.1:${PORT}/overview?view=workspace`,
      width: 1440,
      height: 900,
    },
    {
      name: 'phase2-insights-desktop.png',
      url: `http://127.0.0.1:${PORT}/insights/trends?view=workspace`,
      width: 1440,
      height: 900,
    },
    {
      name: 'phase2-manage-desktop.png',
      url: `http://127.0.0.1:${PORT}/manage/devices?view=workspace`,
      width: 1440,
      height: 900,
    },
    {
      name: 'phase2-mobile.png',
      url: `http://127.0.0.1:${PORT}/overview?view=workspace`,
      width: 390,
      height: 844,
    },
  ];

  for (const t of targets) {
    const outFile = path.join(screenshotsDir, t.name);
    console.log(`[SCREENSHOT] Capturing ${t.name} (${t.width}x${t.height}) from ${t.url}...`);
    const args = [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      `--window-size=${t.width},${t.height}`,
      `--screenshot=${outFile}`,
      t.url,
    ];

    await captureAsync(browserPath, args);
    const stats = fs.existsSync(outFile) ? fs.statSync(outFile) : null;
    console.log(`[SCREENSHOT] Saved ${t.name} (${stats ? `${Math.round(stats.size / 1024)} KB` : 'not created'})`);
  }

  server.close(() => {
    console.log('[SCREENSHOT] Server stopped. All Phase 2 screenshots captured.');
    process.exit(0);
  });
});
