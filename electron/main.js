const { app, BrowserWindow } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
};

// Electron puede cargar index.html directamente con loadFile (protocolo file://),
// pero Chromium bloquea por CORS la carga de módulos ES entre archivos file://.
// Como toda la app está escrita en módulos ES (import/export), servimos la carpeta
// del proyecto por HTTP en localhost — sin bundler, sin build, mismos archivos de siempre.
function startStaticServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent(req.url.split('?')[0]);
      const filePath = path.join(PROJECT_ROOT, urlPath === '/' ? '/index.html' : urlPath);
      // Nunca servir nada fuera de la carpeta del proyecto (rutas con "..").
      if (!filePath.startsWith(PROJECT_ROOT + path.sep)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        const ext = path.extname(filePath);
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
        res.end(data);
      });
    });

    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

let staticServer = null;

async function createWindow() {
  staticServer = await startStaticServer();
  const { port } = staticServer.address();

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    autoHideMenuBar: true,
    backgroundColor: '#eef0f4', // --bg del tema claro: evita el parpadeo blanco al abrir
    icon: path.join(PROJECT_ROOT, 'build', 'icon.ico'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadURL(`http://127.0.0.1:${port}/index.html`);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  staticServer?.close();
  if (process.platform !== 'darwin') app.quit();
});
