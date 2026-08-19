import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.resolve(__dirname, '../client/public');
const logoSource = path.join(publicDir, 'v3_logo-192.png');

const icons = [
  'shortcut-add.png',
  'shortcut-dues.png',
  'shortcut-charts.png',
  'shortcut-budget.png',
  'shortcut-widgets.png',
];

if (fs.existsSync(logoSource)) {
  icons.forEach((iconName) => {
    const dest = path.join(publicDir, iconName);
    fs.copyFileSync(logoSource, dest);
    console.log(`Created ${iconName}`);
  });
} else {
  console.error('Logo source not found:', logoSource);
}
