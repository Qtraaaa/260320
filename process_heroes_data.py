import pandas as pd
import json
import numpy as np
from collections import defaultdict

# CSV 파일 로드
info = pd.read_csv('data/superheroes_info.csv', index_col=0)
powers = pd.read_csv('data/superheroes_power_matrix.csv')
stats = pd.read_csv('data/superheroes_stats.csv')

# 중복된 히어로 제거 (info에서 첫 번째 행만 유지)
info_clean = info.drop_duplicates(subset=['Name'], keep='first')

# 파워 분류
physical_powers = [
    'Agility', 'Super Strength', 'Speed', 'Durability', 'Dexterity',
    'Super Breath', 'Reflexes', 'Invulnerability', 'Peak Human Condition',
    'Jump', 'Stealth', 'Marksmanship', 'Weapons Master', 'Wallcrawling',
    'Enhanced Touch', 'Enhanced Sight', 'Enhanced Hearing', 'Enhanced Senses',
    'Natural Weapons', 'Natural Armor', 'Elasticity', 'Intangibility',
    'Phasing', 'Density Control', 'Stamina', 'Weapon-based Powers',
    'Seismic Power', 'Gliding', 'Molecular Manipulation', 'Adaptation',
    'Heat Resistance', 'Fire Resistance', 'Cold Resistance', 'Underwater breathing',
    'Animal Attributes', 'Animal Oriented Powers', 'Longevity', 'Accelerated Healing'
]

mentality_powers = [
    'Intelligence', 'Telepathy', 'Telekinesis', 'Mind Control', 'Empathy',
    'Clairvoyance', 'Precognition', 'Intuitive aptitude', 'Omnilingualism',
    'Radar Sense', 'Enhanced Memory', 'Photographic Reflexes', 'Illusions',
    'Hypnokinesis', 'Probability Manipulation', 'Mind Blast', 'Mental abilities',
    'Danger Sense', 'Spatial Awareness', 'Telepathy Resistance', 'Mind Control Resistance',
    'Magic Resistance', 'Audio Control', 'Echolocation', 'Sonar'
]

energy_powers = [
    'Energy Blasts', 'Energy Absorption', 'Energy Armor', 'Energy Beams',
    'Energy Constructs', 'Energy Manipulation', 'Energy Resistance',
    'Flight', 'Fire Control', 'Cryokinesis', 'Electrokinesis', 'Heat Generation',
    'Radiation Control', 'Radiation Absorption', 'Radiation Immunity',
    'Light Control', 'Darkforce Manipulation', 'Element Control', 'Elemental Transmogrification',
    'Weather Control', 'Water Control', 'Wind Control', 'Fire Resistance',
    'Cold Resistance', 'Heat Resistance', 'Levitation', 'Anti-Gravity',
    'Gravity Control', 'Lantern Power Ring', 'Power Cosmic', 'Odin Force',
    'Phoenix Force', 'Speed Force', 'The Force', 'Nova Force', 'Qwardian Power Ring',
    'Thermal', 'Power Augmentation', 'Power Absorption', 'Power Nullifier',
    'Power Sense', 'Power Suit', 'Self-Sustenance'
]

# 파워 데이터프레임 처리
power_cols = powers.columns[1:]  # 'Name' 제외
heroes_data = {}

for idx, hero_name in enumerate(powers['Name']):
    # 각 테이블에서 히어로 데이터 찾기
    hero_info = info_clean[info_clean['Name'] == hero_name]
    hero_stats = stats[stats['Name'] == hero_name]
    hero_powers = powers[powers['Name'] == hero_name].iloc[0, 1:]
    
    if hero_info.empty or hero_stats.empty:
        continue
    
    # 파워 데이터 처리
    active_powers = hero_powers[hero_powers == True].index.tolist()
    
    # 파워를 카테고리별로 분류
    physical = [p for p in active_powers if p in physical_powers]
    mentality = [p for p in active_powers if p in mentality_powers]
    energy = [p for p in active_powers if p in energy_powers]
    
    # 분류되지 않은 파워는 other로
    classified = set(physical + mentality + energy)
    other = [p for p in active_powers if p not in classified]
    
    # 기본 정보
    info_row = hero_info.iloc[0]
    stats_row = hero_stats.iloc[0]
    
    # 히어로 데이터 구성
    hero_data = {
        'name': hero_name,
        'identity': info_row['Identity'] if pd.notna(info_row['Identity']) else '',
        'gender': info_row['Gender'] if pd.notna(info_row['Gender']) else '',
        'alignment': stats_row['Alignment'] if pd.notna(stats_row['Alignment']) else '',
        'race': info_row['Race'] if pd.notna(info_row['Race']) else '',
        'publisher': info_row['Publisher'] if pd.notna(info_row['Publisher']) else '',
        'year': int(info_row['Year']) if pd.notna(info_row['Year']) else None,
        'appearances': int(info_row['Appearances']) if pd.notna(info_row['Appearances']) else 0,
        'powers': {
            'all': active_powers,
            'categories': {
                'physical': physical,
                'mentality': mentality,
                'energy': energy,
                'other': other
            }
        },
        'stats': {
            'intelligence': float(stats_row['Intelligence']) if pd.notna(stats_row['Intelligence']) else 0,
            'strength': float(stats_row['Strength']) if pd.notna(stats_row['Strength']) else 0,
            'speed': float(stats_row['Speed']) if pd.notna(stats_row['Speed']) else 0,
            'durability': float(stats_row['Durability']) if pd.notna(stats_row['Durability']) else 0,
            'power': float(stats_row['Power']) if pd.notna(stats_row['Power']) else 0,
            'combat': float(stats_row['Combat']) if pd.notna(stats_row['Combat']) else 0,
            'total': float(stats_row['Total']) if pd.notna(stats_row['Total']) else 0
        }
    }
    
    heroes_data[hero_name] = hero_data

# 히어로들의 파워 카테고리 평균 점수 계산
for hero_name, hero_data in heroes_data.items():
    physical_count = len(hero_data['powers']['categories']['physical'])
    mentality_count = len(hero_data['powers']['categories']['mentality'])
    energy_count = len(hero_data['powers']['categories']['energy'])
    
    total_powers = physical_count + mentality_count + energy_count
    
    hero_data['powerDistribution'] = {
        'physical': {
            'count': physical_count,
            'percentage': (physical_count / total_powers * 100) if total_powers > 0 else 0
        },
        'mentality': {
            'count': mentality_count,
            'percentage': (mentality_count / total_powers * 100) if total_powers > 0 else 0
        },
        'energy': {
            'count': energy_count,
            'percentage': (energy_count / total_powers * 100) if total_powers > 0 else 0
        },
        'totalPowers': total_powers
    }

# 히어로 분배: 균형잡힌 팀 구성 알고리즘
def balance_heroes(heroes_dict):
    """
    히어로들을 physical, mentality, energy 분포를 고려하여 분석
    """
    # 각 타입별로 점수 계산
    hero_scores = []
    
    for name, data in heroes_dict.items():
        dist = data['powerDistribution']
        score = {
            'name': name,
            'physical_score': dist['physical']['percentage'],
            'mentality_score': dist['mentality']['percentage'],
            'energy_score': dist['energy']['percentage'],
            'specialization': max(
                ('physical', dist['physical']['percentage']),
                ('mentality', dist['mentality']['percentage']),
                ('energy', dist['energy']['percentage']),
                key=lambda x: x[1]
            )[0] if dist['totalPowers'] > 0 else 'unknown'
        }
        hero_scores.append(score)
    
    return sorted(hero_scores, key=lambda x: x['physical_score'] + x['mentality_score'] + x['energy_score'], reverse=True)

balanced_analysis = balance_heroes(heroes_data)

# 분석 요약 생성
power_stats = {
    'total_heroes': len(heroes_data),
    'power_classification_summary': {
        'physical_powers': sorted(list(set([p for h in heroes_data.values() for p in h['powers']['categories']['physical']]))),
        'mentality_powers': sorted(list(set([p for h in heroes_data.values() for p in h['powers']['categories']['mentality']]))),
        'energy_powers': sorted(list(set([p for h in heroes_data.values() for p in h['powers']['categories']['energy']]))),
        'other_powers': sorted(list(set([p for h in heroes_data.values() for p in h['powers']['categories']['other']])))
    },
    'hero_distribution': {
        'by_specialization': {},
        'balanced_ranking': balanced_analysis[:20]  # 상위 20명만
    }
}

# 전문화별 히어로 분류
for score in balanced_analysis:
    spec = score['specialization']
    if spec not in power_stats['hero_distribution']['by_specialization']:
        power_stats['hero_distribution']['by_specialization'][spec] = []
    power_stats['hero_distribution']['by_specialization'][spec].append({
        'name': score['name'],
        'physical': round(score['physical_score'], 2),
        'mentality': round(score['mentality_score'], 2),
        'energy': round(score['energy_score'], 2)
    })

# JSON 저장
output_data = {
    'metadata': {
        'generated': pd.Timestamp.now().isoformat(),
        'total_heroes': len(heroes_data),
        'data_files': ['superheroes_info.csv', 'superheroes_power_matrix.csv', 'superheroes_stats.csv']
    },
    'heroes': heroes_data,
    'analysis': power_stats
}

with open('data/heroes_combined.json', 'w', encoding='utf-8') as f:
    json.dump(output_data, f, indent=2, ensure_ascii=False)

# 간단한 분석 파일 생성 (스케치용)
sketch_data = {
    'heroes': []
}

for hero_name, hero_data in heroes_data.items():
    dist = hero_data['powerDistribution']
    sketch_data['heroes'].append({
        'name': hero_name,
        'alignment': hero_data['alignment'],
        'total_stats': hero_data['stats']['total'],
        'physical': round(dist['physical']['percentage'], 1),
        'mentality': round(dist['mentality']['percentage'], 1),
        'energy': round(dist['energy']['percentage'], 1),
        'power_count': dist['totalPowers']
    })

# 균형잡힌 팀 제안 (각 전문화 분야에서 균형잡힌 팀)
def create_balanced_teams(heroes_dict, team_size=6):
    """균형잡힌 팀 구성"""
    teams = {
        'physical_heavy': [],
        'mentality_heavy': [],
        'energy_heavy': [],
        'balanced': []
    }
    
    for hero_name, hero_data in sorted(heroes_dict.items(), key=lambda x: x[1]['stats']['total'], reverse=True):
        dist = hero_data['powerDistribution']
        if dist['totalPowers'] == 0:
            continue
            
        p_pct = dist['physical']['percentage']
        m_pct = dist['mentality']['percentage']
        e_pct = dist['energy']['percentage']
        
        # 전문화 판단
        max_pct = max(p_pct, m_pct, e_pct)
        
        hero_info = {
            'name': hero_name,
            'physical': round(p_pct, 1),
            'mentality': round(m_pct, 1),
            'energy': round(e_pct, 1),
            'power_count': dist['totalPowers']
        }
        
        if p_pct == max_pct and p_pct > 40:
            if len(teams['physical_heavy']) < team_size:
                teams['physical_heavy'].append(hero_info)
        elif m_pct == max_pct and m_pct > 40:
            if len(teams['mentality_heavy']) < team_size:
                teams['mentality_heavy'].append(hero_info)
        elif e_pct == max_pct and e_pct > 40:
            if len(teams['energy_heavy']) < team_size:
                teams['energy_heavy'].append(hero_info)
        else:
            if len(teams['balanced']) < team_size:
                teams['balanced'].append(hero_info)
    
    return teams

sketch_data['balanced_teams'] = create_balanced_teams(heroes_data)

with open('data/heroes_sketch.json', 'w', encoding='utf-8') as f:
    json.dump(sketch_data, f, indent=2, ensure_ascii=False)

print("✓ JSON 파일 생성 완료")
print(f"  - heroes_combined.json: 전체 히어로 정보 (파워 분류 포함)")
print(f"  - heroes_sketch.json: 스케치용 간단한 데이터")
print(f"\n총 {len(heroes_data)}명의 히어로 처리됨")
print(f"\n파워 분류:")
print(f"  - Physical 파워: {len(power_stats['power_classification_summary']['physical_powers'])}개")
print(f"  - Mentality 파워: {len(power_stats['power_classification_summary']['mentality_powers'])}개")
print(f"  - Energy 파워: {len(power_stats['power_classification_summary']['energy_powers'])}개")
print(f"  - Other 파워: {len(power_stats['power_classification_summary']['other_powers'])}개")
print(f"\n히어로 전문화 분포:")
for spec, heroes in power_stats['hero_distribution']['by_specialization'].items():
    print(f"  - {spec}: {len(heroes)}명")
