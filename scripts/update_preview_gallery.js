const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const configPath = path.join(root, 'badges.json');
const galleryPath = path.join(root, 'preview_gallery.html');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const groupNames = Object.fromEntries(config.groups.map(group => [group.id, group.name]));

const badges = config.filters.map(filter => {
  const imageUrl = new URL(filter.imageURL);
  return {
    id: filter.id,
    name: filter.name,
    group: filter.groupId,
    groupName: groupNames[filter.groupId] || filter.groupId,
    file: decodeURIComponent(imageUrl.pathname.split('/').pop())
  };
});

const source = fs.readFileSync(galleryPath, 'utf8');
const startMarker = '    const BADGES = [';
const endMarker = '    ];\n\n    let currentFilter';
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start);

if (start === -1 || end === -1) {
  throw new Error('Unable to find the BADGES data block in preview_gallery.html');
}

const replacement = `    const BADGES = ${JSON.stringify(badges, null, 6)};\n\n    let currentFilter`;
const updated = `${source.slice(0, start)}${replacement}${source.slice(end + endMarker.length)}`;
fs.writeFileSync(galleryPath, updated);
console.log(`Updated preview_gallery.html with ${badges.length} badges.`);
