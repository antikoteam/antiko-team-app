const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

// Fix for ffmpeg error and hardware acceleration issues
app.disableHardwareAcceleration();

// Ensure command line switches are only applied if available
if (app && app.commandLine) {
    app.commandLine.appendSwitch('ignore-certificate-errors');
    app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
    app.commandLine.appendSwitch('log-level', '3');
    app.commandLine.appendSwitch('disable-software-rasterizer');
}

function createWindow() {
    const win = new BrowserWindow({
        width: 450, // Slightly wider for better UI
        height: 850,
        backgroundColor: '#000000',
        resizable: true,
        show: false, // Don't show until ready
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false
        }
    });

    win.setMenuBarVisibility(false);

    // ==========================================
    // Localhost Server to bypass Firebase file:// block
    // ==========================================
    const server = http.createServer((req, res) => {
        let reqUrl = req.url.split('?')[0];
        if (reqUrl === '/') reqUrl = '/index.html';
        const filePath = path.join(__dirname, 'www', reqUrl);

        fs.readFile(filePath, (err, content) => {
            if (err) {
                res.writeHead(404);
                res.end();
            } else {
                let ext = path.extname(filePath);
                let contentType = 'text/html';
                const map = {
                    '.js': 'text/javascript',
                    '.css': 'text/css',
                    '.json': 'application/json',
                    '.png': 'image/png',
                    '.jpg': 'image/jpeg',
                    '.svg': 'image/svg+xml',
                    '.mp3': 'audio/mpeg',
                    '.woff': 'font/woff',
                    '.woff2': 'font/woff2'
                };
                if (map[ext]) contentType = map[ext];

                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf-8');
            }
        });
    });

    server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        const targetUrl = `http://127.0.0.1:${port}`;
        console.log("Antiko Core Live at " + targetUrl);
        win.loadURL(targetUrl).then(() => {
            win.show();
        }).catch(e => {
            console.error("Failed to load Antiko:", e);
        });
    });
}

app.whenReady().then(createWindow);

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
