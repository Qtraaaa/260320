import json

# heroes_combined.json에서 race 정보 추가
with open('data/heroes_combined.json', 'r', encoding='utf-8') as f:
    combined = json.load(f)['heroes']

with open('data/heroes_network.json', 'r', encoding='utf-8') as f:
    network = json.load(f)

# 노드에 race 정보 추가
for node in network['network']['nodes']:
    hero_name = node['name']
    if hero_name in combined:
        race = combined[hero_name].get('race', 'Unknown')
        node['race'] = race

# 같은 race끼리 edges 생성
race_edges = {}
for node in network['network']['nodes']:
    race = node.get('race', 'Unknown')
    if race not in race_edges:
        race_edges[race] = []
    race_edges[race].append(node['id'])

# race_edges를 바탕으로 엣지 추가
race_based_edges = []
for race, node_ids in race_edges.items():
    if len(node_ids) > 1:
        for i in range(len(node_ids)):
            for j in range(i + 1, len(node_ids)):
                race_based_edges.append({
                    'source': node_ids[i],
                    'target': node_ids[j],
                    'weight': 0.3,
                    'type': 'race'
                })

# race_based_edges를 별도 섹션으로 저장
network['race_edges'] = race_based_edges[:5000]  # 성능을 위해 상위 5000개만

# 저장
with open('data/heroes_network.json', 'w', encoding='utf-8') as f:
    json.dump(network, f, indent=2, ensure_ascii=False)

print(f"✓ heroes_network.json 업데이트 완료")
print(f"  - 각 노드에 race 정보 추가")
print(f"  - {len(race_based_edges)}개의 race-based edges 생성")
print(f"  - {len(race_edges)}개의 서로 다른 종족 분류")
