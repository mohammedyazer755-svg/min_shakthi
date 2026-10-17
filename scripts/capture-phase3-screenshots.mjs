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
const browserPath = candidates.find((c) => fs.existsSync(c));
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

const PORT = 4175;
server.listen(PORT, '127.0.0.1', async () => {
  console.log(`[SCREENSHOT] Static server running on http://127.0.0.1:${PORT}`);

  const targets = [
    {
      name: 'phase3-overview-desktop.png',
      url: `http://127.0.0.1:${PORT}/overview?view=workspace`,
      width: 1440,
      height: 900,
    },
    {
      name: 'phase3-channels-desktop.png',
      url: `http://127.0.0.1:${PORT}/channels?view=workspace`,
      width: 1440,
      height: 900,
    },
    {
      name: 'phase3-insights-trends-desktop.png',
      url: `http://127.0.0.1:${PORT}/insights/trends?view=workspace`,
      width: 1440,
      height: 900,
    },
    {
      name: 'phase3-insights-history-desktop.png',
      url: `http://127.0.0.1:${PORT}/insights/history?view=workspace`,
      width: 1440,
      height: 900,
    },
    {
      name: 'phase3-insights-reports-desktop.png',
      url: `http://127.0.0.1:${PORT}/insights/reports?view=workspace`,
      width: 1440,
      height: 900,
    },
    {
      name: 'phase3-alerts-desktop.png',
      url: `http://127.0.0.1:${PORT}/alerts?view=workspace`,
      width: 1440,
      height: 900,
    },
    {
      name: 'phase3-settings-desktop.png',
      url: `http://127.0.0.1:${PORT}/settings?view=workspace`,
      width: 1440,
      height: 900,
    },
    {
      name: 'phase3-manage-devices-desktop.png',
      url: `http://127.0.0.1:${PORT}/manage/devices?view=workspace`,
      width: 1440,
      height: 900,
    },
    {
      name: 'phase3-manage-diagnostics-desktop.png',
      url: `http://127.0.0.1:${PORT}/manage/diagnostics?view=workspace`,
      width: 1440,
      height: 900,
    },
    {
      name: 'phase3-overview-tablet-768.png',
      url: `http://127.0.0.1:${PORT}/overview?view=workspace`,
      width: 768,
      height: 1024,
    },
    {
      name: 'phase3-overview-mobile-390.png',
      url: `http://127.0.0.1:${PORT}/overview?view=workspace`,
      width: 390,
      height: 844,
    },
    {
      name: 'phase3-overview-mobile-360.png',
      url: `http://127.0.0.1:${PORT}/overview?view=workspace`,
      width: 360,
      height: 800,
    },
  ];

  for (const t of targets) {
    const outFile = path.join(screenshotsDir, t.name);
    console.log(`[SCREENSHOT] Capturing ${t.name} (${t.width}x${t.height})...`);

    const args = [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      `--window-size=${t.width},${t.height}`,
      `--screenshot=${outFile}`,
      '--virtual-time-budget=2500',
      t.url,
    ];

    await captureAsync(browserPath, args);

    if (fs.existsSync(outFile) && fs.statSync(outFile).size > 1000) {
      console.log(`[SCREENSHOT] OK: ${t.name} (${(fs.statSync(outFile).size / 1024).toFixed(1)} KB)`);
    } else {
      console.error(`[SCREENSHOT] FAIL or empty: ${t.name}`);
    }
  }

  server.close(() => {
    console.log('[SCREENSHOT] Server stopped. All captures done.');
    process.exit(0);
  });
});
