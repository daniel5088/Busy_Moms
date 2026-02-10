// Create placeholder PNG files for Expo assets
const fs = require('fs');
const path = require('path');

// 1x1 PNG pixel in blue (#3B82F6) - base64 encoded
const bluePngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBgIApD9fPQAAAABJRU5ErkJggg==';
const bluePng = Buffer.from(bluePngBase64, 'base64');

// Create assets directory if it doesn't exist
const assetsDir = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Create 1x1 placeholder PNGs (Expo will resize them)
const files = [
  'icon.png',
  'splash-icon.png',
  'adaptive-icon.png',
  'favicon.png'
];

files.forEach(filename => {
  const filePath = path.join(assetsDir, filename);
  fs.writeFileSync(filePath, bluePng);
  console.log(`✓ Created ${filename}`);
});

console.log('\nPlaceholder PNGs created successfully!');
console.log('Note: These are 1x1 pixel placeholders. Replace with proper assets for production.');
