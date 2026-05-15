const { spawn } = require('child_process');
const path = require('path');

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

console.log('Starting Pogo site via:', npmCmd);

const child = spawn(npmCmd, ['run', 'start'], {
    cwd: __dirname,
    shell: true,
    stdio: 'pipe',
    windowsHide: true
});

child.stdout.on('data', (data) => {
    process.stdout.write(data);
});

child.stderr.on('data', (data) => {
    process.stderr.write(data);
});

child.on('exit', (code) => {
    console.log(`Process exited with code ${code}`);
    process.exit(code);
});
