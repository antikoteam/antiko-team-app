const { app, BrowserWindow } = require('electron');
app.commandLine.appendSwitch('ignore-certificate-errors');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

const path = require('path');

const http = require('http');
const fs = require('fs');

function createWindow() {
    const win = new BrowserWindow({
        // حجم شاشة موبايل احترافي (iPhone 14 style)
        width: 400,
        height: 800,
        resizable: true, // هخليك تطوله أو تقصره لو حابب
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false // تخفيف القيود الأمنية الخاصة بجوجل
        }
    });

    win.setMenuBarVisibility(false);

    // ==========================================
    // Localhost Server to bypass Firebase file:// block
    // ==========================================
    const server = http.createServer((req, res) => {
        let reqUrl = req.url.split('?')[0]; // Remove query strings
        if (reqUrl === '/') reqUrl = '/index.html';

        let filePath = path.join(__dirname, 'www', reqUrl);

        fs.readFile(filePath, (err, content) => {
            if (err) {
                res.writeHead(404);
                res.end();
            } else {
                let ext = path.extname(filePath);
                let contentType = 'text/html';
                if (ext === '.js') contentType = 'text/javascript';
                else if (ext === '.css') contentType = 'text/css';
                else if (ext === '.json') contentType = 'application/json';
                else if (ext === '.png') contentType = 'image/png';
                else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
                else if (ext === '.svg') contentType = 'image/svg+xml';
                else if (ext === '.mp3') contentType = 'audio/mpeg';

                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf-8');
            }
        });
    });

    server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        console.log("Serving Antiko Local Server on http://localhost:" + port);
        win.loadURL(`http://localhost:${port}`);
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
