import json

with open('badges.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

count = 0
for item in data.get('filters', []):
    if 'imageURL' in item and item['imageURL'].endswith('.png'):
        item['imageURL'] = item['imageURL'][:-4] + '.gif'
        count += 1

with open('badges.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
    f.write('\n')

print(f"Updated {count} filter URLs to .gif in badges.json")
