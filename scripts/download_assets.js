const fs = require('fs');
const path = require('path');
const https = require('https');
const { exec } = require('child_process');

const REPO_OWNER = 'PokeMiners';
const REPO_NAME = 'pogo_assets';
const REPO_PATH = 'Images/Pokemon/Addressable Assets';
const TARGET_DIR = path.join(process.env.USERPROFILE, 'Desktop', 'pogo_assets');

// Create target directory
if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
}

console.log(`Downloading assets to ${TARGET_DIR}...`);

// Since GitHub API has rate limits and recursive fetch might be complex for a large folder,
// we'll use a sparse checkout approach which is more robust for "downloading a folder".

const tempDir = path.join(process.env.TEMP, 'pogo_assets_temp');
if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
}
fs.mkdirSync(tempDir);

console.log('Cloning repository (sparse)...');

const commands = [
    `git init`,
    `git remote add origin https://github.com/${REPO_OWNER}/${REPO_NAME}.git`,
    `git config core.sparseCheckout true`,
    `echo "${REPO_PATH}/*" >> .git/info/sparse-checkout`,
    `git pull origin master --depth 1`
];

// Execute commands sequentially
const runCommands = async () => {
    try {
        process.chdir(tempDir);
        for (const cmd of commands) {
            console.log(`Running: ${cmd}`);
            await new Promise((resolve, reject) => {
                exec(cmd, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`Error: ${error.message}`);
                        reject(error);
                        return;
                    }
                    if (stderr) console.error(stderr);
                    resolve();
                });
            });
        }

        // Move files to Desktop
        console.log('Moving files to Desktop...');
        const sourcePath = path.join(tempDir, REPO_PATH);

        // We need to move the contents of sourcePath to TARGET_DIR
        // fs.cpSync is available in Node 16.7+
        fs.cpSync(sourcePath, TARGET_DIR, { recursive: true });

        console.log('Done! Files are in ' + TARGET_DIR);

        // Cleanup
        process.chdir(process.env.USERPROFILE); // Move out of temp before deleting
        // fs.rmSync(tempDir, { recursive: true, force: true }); // Optional cleanup

    } catch (error) {
        console.error('Failed:', error);
    }
};

runCommands();
