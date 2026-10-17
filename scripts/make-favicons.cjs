const fs = require('fs');
const path = require('path');

const publicDir = path.resolve(__dirname, '../public');

// 1. Generate favicon.svg containing base64 of logo-128.png
const logo128Path = path.join(publicDir, 'logo-128.png');
const b64 = fs.readFileSync(logo128Path).toString('base64');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <image href="data:image/png;base64,${b64}" width="128" height="128" preserveAspectRatio="xMidYMid meet" />
</svg>
`;
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svg, 'utf8');

// 2. Generate standard Windows / Browser favicon.ico wrapping logo-32.png
const pngBytes = fs.readFileSync(path.join(publicDir, 'logo-32.png'));
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0); // Reserved
icoHeader.writeUInt16LE(1, 2); // Icon type
icoHeader.writeUInt16LE(1, 4); // 1 image

const dirEntry = Buffer.alloc(16);
dirEntry.writeUInt8(32, 0); // Width
dirEntry.writeUInt8(32, 1); // Height
dirEntry.writeUInt8(0, 2);  // Colors
dirEntry.writeUInt8(0, 3);  // Reserved
dirEntry.writeUInt16LE(1, 4); // Planes
dirEntry.writeUInt16LE(32, 6); // BPP
dirEntry.writeUInt32LE(pngBytes.length, 8); // Size
dirEntry.writeUInt32LE(22, 12); // Offset (6 + 16 = 22)

const icoFile = Buffer.concat([icoHeader, dirEntry, pngBytes]);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoFile);

console.log('Successfully created public/favicon.svg and public/favicon.ico');
