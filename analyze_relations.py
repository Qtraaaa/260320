import json

with open('data/heroes_network.json', encoding='utf-8') as f:
    network = json.load(f)

with open('data/heroes_combined.json', encoding='utf-8') as f:
    combined = json.load(f)['heroes']

print('=== 가능한 관계도 조건 분석 ===\n')

# 1. Similarity edges
print('1️⃣ SIMILARITY EDGES (파워 분포 & 스탯 기반)')
print(f'   개수: {len(network["network"]["edges"])}')
print(f'   weight: 유사도 점수 (0-1)')
print(f'   설명: 히어로의 능력 분포와 스탯 종합')

# 2. Alignment 기반
alignments = {}
for name, data in combined.items():
    align = data.get('alignment', 'unknown')
    alignments[align] = alignments.get(align, 0) + 1
    
print('\n2️⃣ ALIGNMENT-BASED (같은 우호도)')
for align, count in sorted(alignments.items(), key=lambda x: x[1], reverse=True):
    print(f'   {align}: {count}명')

# 3. Publisher 기반
publishers = {}
for name, data in combined.items():
    pub = data.get('publisher', 'unknown')
    publishers[pub] = publishers.get(pub, 0) + 1
    
print('\n3️⃣ PUBLISHER-BASED (같은 출판사)')
for pub, count in sorted(publishers.items(), key=lambda x: x[1], reverse=True)[:5]:
    print(f'   {pub}: {count}명')

# 4. Power Type 기반
power_types = {'Physical': 0, 'Mentality': 0, 'Energy': 0, 'Balanced': 0}
for node in network['network']['nodes']:
    max_pct = max(node['physical'], node['mentality'], node['energy'])
    if node['physical'] == max_pct and node['physical'] > 40:
        power_types['Physical'] += 1
    elif node['mentality'] == max_pct and node['mentality'] > 40:
        power_types['Mentality'] += 1
    elif node['energy'] == max_pct and node['energy'] > 40:
        power_types['Energy'] += 1
    else:
        power_types['Balanced'] += 1

print('\n4️⃣ POWER-TYPE-BASED (같은 능력 분류)')
for ptype, count in sorted(power_types.items(), key=lambda x: x[1], reverse=True):
    print(f'   {ptype}: {count}명')

# 5. Race 기반 (현재)
races = {}
for node in network['network']['nodes']:
    race = node.get('race', 'Unknown')
    races[race] = races.get(race, 0) + 1
    
print('\n5️⃣ RACE-BASED (현재 사용 중)')
print(f'   종족 개수: {len(races)}')
print(f'   race_edges: {len(network.get("race_edges", []))}')

print('\n' + '='*50)
print('추천: SIMILARITY EDGES (이미 존재하며 가장 의미있음)')
print('='*50)
