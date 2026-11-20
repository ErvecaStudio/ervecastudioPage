const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const jsonPath = path.resolve('data/roadmaps.json');
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
(async () => {
  for (const track of json.tracks) {
    for (const item of track.items) {
      if (!item.image || item.image.endsWith('.webp')) continue;
      const src = path.resolve('data', item.image);
      const out = src.replace(/\.(png|jpe?g)$/i, '.webp');
      await sharp(src)
        .resize({ width: 800, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(out);
      item.image = item.image.replace(/\.(png|jpe?g)$/i, '.webp');
    }
  }
  const root = path.resolve('img');
  const gitignorePath = path.resolve('.gitignore');
  const dupes = fs.readdirSync(root, { recursive: true })
    .filter(f => !f.includes('node_modules') && /\.png$/i.test(f) && fs.existsSync(path.join(root, f.replace(/\.png$/i, '.webp'))))
    .map(f => 'img/' + f.split(path.sep).join('/'));
  const current = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8') : '';
  const known = new Set(current.split(/\r?\n/));
  const toAdd = dupes.filter(l => !known.has(l));
  if (toAdd.length) {
    fs.appendFileSync(gitignorePath, (current && !current.endsWith('\n') ? '\n' : '') + toAdd.join('\n') + '\n');
  }
  fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2));
})();