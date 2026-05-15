const { spawn } = require('child_process');

console.log('Starting Cloudflare Tunnel for BOTH sites...');
console.log('- lucasmoreau.fr on port 3000');
console.log('- pogopoitiers.fr on port 3062');
console.log('');

const tunnel = spawn('c:\\Users\\lucas\\.gemini\\antigravity\\scratch\\pogopoitiers\\cloudflared.exe', [
    'tunnel',
    '--config',
    'cloudflared-combined.yml',
    'run'
], {
    cwd: 'c:\\Users\\lucas\\.gemini\\antigravity\\scratch\\pogopoitiers',
    windowsHide: true
});

tunnel.stdout.on('data', (data) => {
    console.log(`[TUNNEL] ${data}`);
});

tunnel.stderr.on('data', (data) => {
    console.error(`[TUNNEL] ${data}`);
});

tunnel.on('close', (code) => {
    console.log(`Tunnel process exited with code ${code}`);
});
