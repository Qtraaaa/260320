import json
import numpy as np
from collections import defaultdict

# 생성된 JSON 파일 로드
with open('data/heroes_combined.json', 'r', encoding='utf-8') as f:
    heroes_data = json.load(f)['heroes']

# ============================================================
# 1. 히어로 유사성 점수 계산
# ============================================================
def calculate_hero_similarity(hero1, hero2):
    """
    두 히어로의 유사성 점수 계산 (0-1)
    - 공통 파워 개수
    - Power 분포 유사성
    - Stats 유사성
    """
    h1_powers = set(hero1['powers']['all'])
    h2_powers = set(hero2['powers']['all'])
    
    # 공통 파워 비율
    if len(h1_powers) == 0 or len(h2_powers) == 0:
        power_similarity = 0
    else:
        common = len(h1_powers & h2_powers)
        total = len(h1_powers | h2_powers)
        power_similarity = common / total if total > 0 else 0
    
    # 파워 분포 유사성
    dist1 = hero1['powerDistribution']
    dist2 = hero2['powerDistribution']
    
    if dist1['totalPowers'] > 0 and dist2['totalPowers'] > 0:
        p_sim = 1 - abs(dist1['physical']['percentage'] - dist2['physical']['percentage']) / 100
        m_sim = 1 - abs(dist1['mentality']['percentage'] - dist2['mentality']['percentage']) / 100
        e_sim = 1 - abs(dist1['energy']['percentage'] - dist2['energy']['percentage']) / 100
        distribution_similarity = (p_sim + m_sim + e_sim) / 3
    else:
        distribution_similarity = 0
    
    # Stats 유사성 (정규화)
    s1_vals = np.array([hero1['stats'][k] for k in ['intelligence', 'strength', 'speed', 'durability', 'power', 'combat']])
    s2_vals = np.array([hero2['stats'][k] for k in ['intelligence', 'strength', 'speed', 'durability', 'power', 'combat']])
    
    max_val = max(np.max(s1_vals), np.max(s2_vals))
    if max_val > 0:
        s1_norm = s1_vals / max_val
        s2_norm = s2_vals / max_val
        stats_similarity = 1 - np.mean(np.abs(s1_norm - s2_norm))
    else:
        stats_similarity = 0
    
    # 가중 평균
    similarity = (power_similarity * 0.5 + distribution_similarity * 0.3 + stats_similarity * 0.2)
    
    return round(similarity, 3)

# ============================================================
# 2. 네트워크 그래프 데이터 구성
# ============================================================
heroes_list = list(heroes_data.items())
network_data = {
    'nodes': [],
    'edges': [],
    'nodeMap': {}
}

# 노드 생성
for idx, (name, data) in enumerate(heroes_list):
    dist = data['powerDistribution']
    node = {
        'id': idx,
        'name': name,
        'alignment': data['alignment'],
        'totalStats': data['stats']['total'],
        'physical': round(dist['physical']['percentage'], 1),
        'mentality': round(dist['mentality']['percentage'], 1),
        'energy': round(dist['energy']['percentage'], 1),
        'powerCount': dist['totalPowers'],
        'publisher': data['publisher']
    }
    network_data['nodes'].append(node)
    network_data['nodeMap'][name] = idx

# 에지 생성 (높은 유사성의 히어로들끼리만)
similarity_threshold = 0.35
edges_added = 0

for i in range(len(heroes_list)):
    for j in range(i + 1, len(heroes_list)):
        name1, hero1_data = heroes_list[i]
        name2, hero2_data = heroes_list[j]
        
        similarity = calculate_hero_similarity(hero1_data, hero2_data)
        
        if similarity >= similarity_threshold:
            network_data['edges'].append({
                'source': i,
                'target': j,
                'weight': similarity
            })
            edges_added += 1

print(f"네트워크 에지 생성: {edges_added}개 (유사도 >= {similarity_threshold})")

# ============================================================
# 3. 최적 팀 생성 (Balanced Team Generator)
# ============================================================
def generate_optimized_teams(heroes_dict, team_size=6):
    """
    각 파워 분배별로 최적화된 팀 생성
    - 전문화 영역이 다른 히어로들을 섞기
    - Stats 균형 맞추기
    """
    teams = {
        'suggestions': []
    }
    
    # 히어로를 전문화별로 그룹핑
    specialists = defaultdict(list)
    
    for name, data in heroes_dict.items():
        dist = data['powerDistribution']
        if dist['totalPowers'] == 0:
            continue
        
        p = dist['physical']['percentage']
        m = dist['mentality']['percentage']
        e = dist['energy']['percentage']
        
        # 가장 높은 비율 결정
        max_val = max(p, m, e)
        if p == max_val and p > 35:
            spec = 'physical'
        elif m == max_val and m > 35:
            spec = 'mentality'
        elif e == max_val and e > 35:
            spec = 'energy'
        else:
            spec = 'balanced'
        
        specialists[spec].append({
            'name': name,
            'physical': p,
            'mentality': m,
            'energy': e,
            'stats': data['stats']['total'],
            'power_count': dist['totalPowers']
        })
    
    # 각 전문화별로 정렬 (stats 순)
    for spec in specialists:
        specialists[spec].sort(key=lambda x: x['stats'], reverse=True)
    
    # 팀 제안 3가지 생성
    team_proposals = [
        {
            'name': 'All-Rounder Team (균형 팀)',
            'strategy': '각 전문화 분야에서 상위 선수 조합',
            'members': []
        },
        {
            'name': 'Physical Dominant Team (피지컬 팀)',
            'strategy': 'Physical 파워에 집중',
            'members': []
        },
        {
            'name': 'Mixed Strategy Team (혼합 팀)',
            'strategy': '전문화 다양하게 섞기',
            'members': []
        }
    ]
    
    # All-Rounder Team
    for spec in ['physical', 'mentality', 'energy']:
        if specialists[spec]:
            team_proposals[0]['members'].append(specialists[spec][0])
    if specialists['balanced']:
        team_proposals[0]['members'].extend(specialists['balanced'][:3])
    
    # Physical Dominant Team
    if specialists['physical']:
        team_proposals[1]['members'] = specialists['physical'][:6]
    
    # Mixed Strategy Team
    for spec in ['physical', 'mentality', 'energy', 'balanced']:
        if specialists[spec]:
            team_proposals[2]['members'].extend(specialists[spec][:2])
    
    teams['suggestions'] = team_proposals
    return teams

optimized_teams = generate_optimized_teams(heroes_data)

# ============================================================
# 4. 파워 분석 (Most Common Powers by Category)
# ============================================================
power_frequency = defaultdict(int)
category_powers = {'physical': {}, 'mentality': {}, 'energy': {}}

for name, data in heroes_data.items():
    for cat in ['physical', 'mentality', 'energy']:
        for power in data['powers']['categories'][cat]:
            if power not in category_powers[cat]:
                category_powers[cat][power] = {'count': 0, 'heroes': []}
            category_powers[cat][power]['count'] += 1
            category_powers[cat][power]['heroes'].append(name)

# 각 카테고리별 상위 10개 파워
power_analysis = {}
for cat in category_powers:
    sorted_powers = sorted(category_powers[cat].items(), key=lambda x: x[1]['count'], reverse=True)
    power_analysis[cat] = [
        {
            'power': power,
            'count': data['count'],
            'percentage': round(data['count'] / len(heroes_data) * 100, 2)
        }
        for power, data in sorted_powers[:10]
    ]

# ============================================================
# 5. 통계 데이터
# ============================================================
stats_summary = {
    'total_heroes': len(heroes_data),
    'power_distribution': {
        'physical': len([h for h in heroes_data.values() if h['powerDistribution']['totalPowers'] > 0 and h['powerDistribution']['physical']['percentage'] > 40]),
        'mentality': len([h for h in heroes_data.values() if h['powerDistribution']['totalPowers'] > 0 and h['powerDistribution']['mentality']['percentage'] > 40]),
        'energy': len([h for h in heroes_data.values() if h['powerDistribution']['totalPowers'] > 0 and h['powerDistribution']['energy']['percentage'] > 40]),
        'balanced': len([h for h in heroes_data.values() if h['powerDistribution']['totalPowers'] > 0 and max(h['powerDistribution']['physical']['percentage'], h['powerDistribution']['mentality']['percentage'], h['powerDistribution']['energy']['percentage']) <= 40])
    },
    'alignment_distribution': defaultdict(int),
    'publisher_distribution': defaultdict(int)
}

for data in heroes_data.values():
    if data['alignment']:
        stats_summary['alignment_distribution'][data['alignment']] = stats_summary['alignment_distribution'].get(data['alignment'], 0) + 1
    if data['publisher']:
        stats_summary['publisher_distribution'][data['publisher']] = stats_summary['publisher_distribution'].get(data['publisher'], 0) + 1

stats_summary['alignment_distribution'] = dict(sorted(stats_summary['alignment_distribution'].items(), key=lambda x: x[1], reverse=True))
stats_summary['publisher_distribution'] = dict(sorted(stats_summary['publisher_distribution'].items(), key=lambda x: x[1], reverse=True)[:10])

# ============================================================
# 최종 데이터 구성
# ============================================================
final_data = {
    'metadata': {
        'version': '1.0',
        'description': '히어로 유사성 네트워크 및 팀 구성 시뮬레이션용 데이터',
        'use_case': 'Dynamic hero similarity network visualization in sketch.js'
    },
    'network': network_data,
    'teams': optimized_teams,
    'power_analysis': power_analysis,
    'statistics': stats_summary
}

# ============================================================
# JSON 파일로 저장
# ============================================================
with open('data/heroes_network.json', 'w', encoding='utf-8') as f:
    json.dump(final_data, f, indent=2, ensure_ascii=False)

print("\n✓ heroes_network.json 생성 완료")
print(f"  - 노드: {len(network_data['nodes'])}")
print(f"  - 에지: {len(network_data['edges'])}")
print(f"\n파워 분포 분석:")
for cat, powers in power_analysis.items():
    print(f"\n[{cat.upper()}] 상위 5개 파워:")
    for item in powers[:5]:
        print(f"    {item['power']}: {item['count']}명 ({item['percentage']}%)")

print(f"\n팀 구성 제안: {len(optimized_teams['suggestions'])}개 시나리오")
for team in optimized_teams['suggestions']:
    print(f"  - {team['name']}: {len(team['members'])}명")

print("\n히어로 전문화 분포:")
for spec, count in stats_summary['power_distribution'].items():
    print(f"  - {spec}: {count}명")
