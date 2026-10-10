import fs from 'fs';
import path from 'path';
import https from 'https';
import { execSync } from 'child_process';

const toolsDir = path.resolve('tools', 'arduino-cli');
if (!fs.existsSync(toolsDir)) {
  fs.mkdirSync(toolsDir, { recursive: true });
}

const zipPath = path.join(toolsDir, 'arduino-cli.zip');
const url = 'https://github.com/arduino/arduino-cli/releases/download/v1.5.1/arduino-cli_1.5.1_Windows_64bit.zip';

console.log('Downloading arduino-cli from GitHub...');

function download(url, dest, cb) {
  https.get(url, (res) => {
    if (res.statusCode === 302 || res.statusCode === 301) {
      return download(res.headers.location, dest, cb);
    }
    const file = fs.createWriteStream(dest);
    res.pipe(file);
    file.on('finish', () => {
      file.close(cb);
    });
  }).on('error', (err) => {
    console.error('Download error:', err.message);
  });
}

download(url, zipPath, () => {
  console.log('Download complete. Extracting via PowerShell...');
  execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${toolsDir}' -Force; Remove-Item -Force '${zipPath}'"`);
  console.log('Extraction complete!');
  const ver = execSync(`"${path.join(toolsDir, 'arduino-cli.exe')}" version`).toString();
  console.log('Arduino CLI installed successfully:', ver);
});
