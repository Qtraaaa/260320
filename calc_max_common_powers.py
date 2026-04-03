import json

with open('data/heroes_combined.json', encoding='utf-8') as f:
    heroes = json.load(f)['heroes']

# 공통 파워 개수 계산
max_common_powers = 0
hero_list = list(heroes.items())

for i in range(len(hero_list)):
    for j in range(i + 1, len(hero_list)):
        name1, hero1 = hero_list[i]
        name2, hero2 = hero_list[j]
        
        powers1 = set(hero1['powers']['all'])
        powers2 = set(hero2['powers']['all'])
        
        common = len(powers1 & powers2)
        if common > max_common_powers:
            max_common_powers = common

print(f"최대 공통 파워 수: {max_common_powers}개")
print(f"슬라이더 범위: 1 ~ {max_common_powers}")
