import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../apps/web/dist');
const screenshotsDir = path.resolve(__dirname, '../docs/evidence/screenshots');
const artifactDir = 'C:\\Users\\Mohammed yazer\\.gemini\\antigravity\\brain\\0056d465-1349-4200-8088-d05ba2ae911d';

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
  console.error('[PHASE 5 CAPTURE] No browser executable found');
  process.exit(1);
}
console.log(`[PHASE 5 CAPTURE] Using browser: ${browserPath}`);

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
  });
}

server.listen(4195, async () => {
  console.log('[PHASE 5 CAPTURE] Server running at http://localhost:4195');

  const captures = [
    {
      name: 'phase5-landing-desktop.png',
      url: 'http://localhost:4195/',
      width: 1440,
      height: 900,
      extraFlags: [],
    },
    {
      name: 'phase5-landing-mobile.png',
      url: 'http://localhost:4195/',
      width: 390,
      height: 844,
      extraFlags: [],
    },
    {
      name: 'phase5-static-fallback.png',
      url: 'http://localhost:4195/',
      width: 1440,
      height: 900,
      extraFlags: ['--disable-webgl', '--disable-3d-apis'],
    },
  ];

  for (const cap of captures) {
    const outPath = path.join(screenshotsDir, cap.name);
    const args = [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      `--window-size=${cap.width},${cap.height}`,
      `--screenshot=${outPath}`,
      '--virtual-time-budget=2000',
      ...cap.extraFlags,
      cap.url,
    ];

    console.log(`[PHASE 5 CAPTURE] Capturing ${cap.name} (${cap.width}x${cap.height})...`);
    await captureAsync(browserPath, args);
    if (fs.existsSync(outPath)) {
      const stat = fs.statSync(outPath);
      console.log(`[PHASE 5 CAPTURE] Saved ${cap.name} (${stat.size} bytes)`);

      // Copy to artifact directory if present
      if (fs.existsSync(artifactDir)) {
        const destArtifact = path.join(artifactDir, cap.name);
        fs.copyFileSync(outPath, destArtifact);
        console.log(`[PHASE 5 CAPTURE] Copied to artifact: ${destArtifact}`);
      }
    } else {
      console.warn(`[PHASE 5 CAPTURE] Failed to save ${cap.name}`);
    }
  }

  server.close(() => {
    console.log('[PHASE 5 CAPTURE] Complete. Server closed.');
    process.exit(0);
  });
});
