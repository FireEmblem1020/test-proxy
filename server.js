const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cookieParser = require('cookie-parser');
const app = express();
const PORT = process.env.PORT || 3000;

// 🛑 SET YOUR PRIVATE PASSWORD INSIDE THE QUOTES BELOW
const PROXY_PASSWORD = "howdidyoufindthis";

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Serve the frontend interface when visiting the main website URL
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>404 Not Found</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #fff; color: #000; padding: 40px; margin: 0; user-select: none; }
                h1 { font-size: 24px; font-weight: 500; margin-top: 0; margin-bottom: 10px; }
                p { font-size: 14px; color: #333; margin: 0 0 20px 0; }
                hr { border: 0; border-top: 1px solid #ddd; margin: 20px 0; }
                .footer { font-size: 12px; color: #777; font-style: italic; }
                .hidden { display: none !important; }
                
                /* Invisible Trigger in Top Left Corner */
                #secretTrigger { position: absolute; top: 0; left: 0; width: 40px; height: 40px; cursor: default; background: transparent; z-index: 99999; }
                
                /* Dark Mode Game Launcher UI */
                .launcher-body { background-color: #121212 !important; color: #fff !important; display: flex !important; flex-direction: column; align-items: center; justify-content: center; height: 100vh; padding: 0; }
                .container { background: #1e1e1e; padding: 25px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.5); text-align: center; width: 360px; color: #fff; }
                .container input { width: 90%; padding: 10px; margin-bottom: 15px; border: 1px solid #444; border-radius: 4px; background: #2d2d2d; color: #fff; font-size: 14px; }
                .container button { background: #4CAF50; color: white; border: none; padding: 12px 15px; border-radius: 4px; cursor: pointer; font-weight: bold; width: 100%; font-size: 14px; }
                .container button:hover { background: #45a049; }
                .container h2, .container p { color: #fff; margin: 10px 0; }
            </style>
        </head>
        <body id="pageBody">

            <!-- Hidden Hitbox Trigger -->
            <div id="secretTrigger" onclick="revealLauncher()"></div>

            <!-- Fake Apache Server Error Screen -->
            <div id="errorScreen">
                <h1>Not Found</h1>
                <p>The requested URL was not found on this server.</p>
                <hr>
                <div class="footer">Apache/2.4.41 (Ubuntu) Server at Port 80</div>
            </div>

            <!-- Hidden Dashboard Panel -->
            <div id="launcherScreen" class="container hidden">
                <h2>Universal Proxy Launcher</h2>
                <p>Enter any game link or portal website address:</p>
                <input type="text" id="targetUrl" placeholder="https://crazygames.com" value="https://winterpixel.io">
                <button onclick="launchProxy()">Launch Unblocked</button>
            </div>

            <script>
                let savedPassword = "";

                function revealLauncher() {
                    let passInput = prompt("Enter passcode:");
                    if (passInput !== null && passInput.trim() !== "") {
                        savedPassword = passInput;
                        // Client-side UI Swap
                        document.getElementById('errorScreen').classList.add('hidden');
                        document.getElementById('launcherScreen').classList.remove('hidden');
                        document.getElementById('pageBody').classList.add('launcher-body');
                    }
                }

                function launchProxy() {
                    let url = document.getElementById('targetUrl').value.trim();
                    if (!url) { alert("Please enter a URL."); return; }
                    if (!url.startsWith('http://') && !url.startsWith('https://')) { url = 'https://' + url; }

                    // Sync parameters with session initializer routing
                    let proxiedUrl = window.location.origin + '/proxy_init?url=' + encodeURIComponent(url) + '&pwd=' + encodeURIComponent(savedPassword);
                    let blankWindow = window.open('about:blank', '_blank');

                    if (!blankWindow) {
                        alert("Pop-up blocked! Look at the right side of your browser link bar, click the pop-up warning icon, and allow pop-ups for this website.");
                        return;
                    }

                    // Open everything smoothly into the about:blank framing canvas with fake Tab Cloaking
                    blankWindow.document.write(\`
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <!-- 🛠️ TAB CLOAKING DATA -->
                            <title>Google Docs</title>
                            <link rel="icon" type="image/x-icon" href="https://gstatic.com">
                            
                            <style>
                                body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #000; }
                                iframe { width: 100%; height: 100%; border: none; }
                            </style>
                        </head>
                        <body>
                            <iframe src="\${proxiedUrl}" allowfullscreen></iframe>
                        </body>
                        </html>
                    \`);
                    blankWindow.document.close();
                }
            </script>
        </body>
        </html>
    `);
});

// Gateway Config: Saves target domains safely within cookies on submission
app.get('/proxy_init', (req, res) => {
    const targetUrl = req.query.url;
    const providedPassword = req.query.pwd;
    
    if (providedPassword !== PROXY_PASSWORD) {
        return res.status(403).send('<h1>403 Forbidden</h1><p>Access Denied.</p>');
    }
    
    if (!targetUrl) return res.status(400).send('Missing target game URL.');

    try {
        const urlObj = new URL(targetUrl);
        // Extract home domain so all relative path background requests look here
        res.cookie('current_proxy_domain', urlObj.origin, { path: '/', httpOnly: true });
        res.cookie('current_proxy_auth', providedPassword, { path: '/', httpOnly: true });
        res.redirect(targetUrl);
    } catch (e) {
        res.status(400).send('Invalid website address format.');
    }
});

// Strips out strict modern headers that prevent nesting inside an iframe or cross-domain requests
const cleanHeaders = (proxyRes, req, res) => {
    delete proxyRes.headers['x-frame-options'];
    delete proxyRes.headers['content-security-policy'];
    delete proxyRes.headers['content-security-policy-report-only'];
    delete proxyRes.headers['cross-origin-embedder-policy'];
    delete proxyRes.headers['cross-origin-opener-policy'];
    proxyRes.headers['access-control-allow-origin'] = '*';
    proxyRes.headers['access-control-allow-credentials'] = 'true';
};

// Global Traffic Router: catches every relative sub-request code file, image, or styles file automatically
app.use((req, res, next) => {
    if (req.path === '/' || req.path === '/proxy_init') return next();

    const targetDomain = req.cookies['current_proxy_domain'];
    const sessionAuth = req.cookies['current_proxy_auth'];

    if (sessionAuth !== PROXY_PASSWORD || !targetDomain) {
        return res.status(403).send('<h1>Session Closed</h1><p>Please open the launcher tool from your main dashboard link again.</p>');
    }

    createProxyMiddleware({
        target: targetDomain,
        changeOrigin: true,
        ws: true, // Enables full WebSocket protocol pipelines for live multiplayer data
        onProxyRes: cleanHeaders,
        onError: (err, req, res) => {
            if (!res.headersSent) {
                res.status(500).send('Proxy framework asset streaming dropped.');
            }
        }
    })(req, res, next);
});

app.listen(PORT, () => console.log('Stealth game engine engine wrapper initialized.'));
