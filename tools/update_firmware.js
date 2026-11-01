const fs = require('fs');
const crypto = require('crypto');
const { execSync } = require('child_process');

console.log('--- Step 1: Patching AirGuard_ESP32_App.bin ---');
let buf = fs.readFileSync('firmware/AirGuard_ESP32_App.bin');
let str = buf.toString('latin1');

const orig = 'placeholder="Type Hidden Wi-Fi Name (SSID)" style="display:none;"';
const repl = 'placeholder="Enter 2.4G Wi-Fi Name (SSID)" style="display:block;"';

if (orig.length !== repl.length) {
  throw new Error('Lengths must match exactly! ' + orig.length + ' vs ' + repl.length);
}

const idx = str.indexOf(orig);
if (idx === -1) {
  throw new Error('Original string not found in App.bin!');
}

console.log(`Found snippet at byte offset ${idx}, replacing...`);
buf.write(repl, idx, 'latin1');

console.log('--- Step 2: Recalculating ESP32 Checksums ---');
const segCount = buf[1];
let offset = 24;
let xorSum = 0xEF;
for (let i = 0; i < segCount; i++) {
  let len = buf.readUInt32LE(offset + 4);
  offset += 8;
  for (let j = 0; j < len; j++) {
    xorSum ^= buf[offset + j];
  }
  offset += len;
}

// Byte buf.length - 33 is the XOR checksum
const checksumOffset = buf.length - 33;
console.log(`Old XOR Checksum at offset ${checksumOffset}: 0x${buf[checksumOffset].toString(16)} -> New: 0x${xorSum.toString(16)}`);
buf[checksumOffset] = xorSum;

// Last 32 bytes are the SHA-256 validation hash of everything before it
const hashOffset = buf.length - 32;
const newSha256 = crypto.createHash('sha256').update(buf.slice(0, hashOffset)).digest();
newSha256.copy(buf, hashOffset);
console.log('New SHA-256 Validation Hash:', newSha256.toString('hex'));

fs.writeFileSync('firmware/AirGuard_ESP32_App.bin', buf);
console.log('Saved patched AirGuard_ESP32_App.bin successfully.');

console.log('--- Step 3: Verifying with esptool ---');
const esptoolPath = 'C:\\Users\\user\\AppData\\Local\\Arduino15\\packages\\esp32\\tools\\esptool_py\\5.3.1\\esptool.exe';
const verifyOutput = execSync(`"${esptoolPath}" image-info "firmware/AirGuard_ESP32_App.bin"`).toString();
console.log(verifyOutput);

console.log('--- Step 4: Generating All-In-One Merged Binary ---');
// Merge bootloader (0x1000), partitions (0x8000), boot_app0 (0xe000), and app (0x10000)
const mergeCmd = `"${esptoolPath}" --chip esp32 merge_bin -o "firmware/AirGuard_ESP32_AllInOne.bin" --flash_mode dio --flash_freq 80m --flash_size 4MB 0x1000 "Arduino/AirQualityNode/build/AirQualityNode.ino.bootloader.bin" 0x8000 "Arduino/AirQualityNode/build/AirQualityNode.ino.partitions.bin" 0xe000 "Arduino/AirQualityNode/build/boot_app0.bin" 0x10000 "firmware/AirGuard_ESP32_App.bin"`;
console.log('Running:', mergeCmd);
const mergeOutput = execSync(mergeCmd).toString();
console.log(mergeOutput);

// Copy to Frontend
fs.copyFileSync('firmware/AirGuard_ESP32_AllInOne.bin', 'Frontend/public/firmware/AirGuard_ESP32_AllInOne.bin');
if (fs.existsSync('Frontend/dist/firmware')) {
  fs.copyFileSync('firmware/AirGuard_ESP32_AllInOne.bin', 'Frontend/dist/firmware/AirGuard_ESP32_AllInOne.bin');
}
console.log('Updated Frontend/public/firmware/AirGuard_ESP32_AllInOne.bin!');
console.log('ALL DONE! The website flasher now burns the updated firmware with visible SSID input!');
