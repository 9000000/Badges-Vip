import json

with open('badges.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for item in data.get('filters', []):
    if 'imageURL' in item:
        # replace leonevz/Elite-Badges with 9000000/Badges-Vip
        item['imageURL'] = item['imageURL'].replace('leonevz/Elite-Badges', '9000000/Badges-Vip')

with open('badges.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
    f.write('\n')

print("Updated badges.json with new repo repository URL: 9000000/Badges-Vip")
