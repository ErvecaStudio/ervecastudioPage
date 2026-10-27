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
  fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2));
})();