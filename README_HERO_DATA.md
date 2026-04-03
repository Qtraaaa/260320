# 히어로 데이터 통합 및 네트워크 분석 가이드

## 📊 생성된 파일 매핑

### 1. **heroes_combined.json** (완전 데이터)
전체 히어로 정보가 포함된 마스터 파일

**구조:**
```json
{
  "heroes": {
    "히어로명": {
      "name": "히어로명",
      "alignment": "good/bad/neutral",
      "gender": "Male/Female",
      "race": "종족",
      "publisher": "출판사",
      "year": "출현년도",
      "powers": {
        "all": ["모든 파워들..."],
        "categories": {
          "physical": ["피지컬 파워들..."],
          "mentality": ["정신 파워들..."],
          "energy": ["에너지 파워들..."],
          "other": ["분류되지 않은 파워들..."]
        }
      },
      "powerDistribution": {
        "physical": { "count": 숫자, "percentage": 백분율 },
        "mentality": { "count": 숫자, "percentage": 백분율 },
        "energy": { "count": 숫자, "percentage": 백분율 },
        "totalPowers": 총파워개수
      },
      "stats": {
        "intelligence": 숫자,
        "strength": 숫자,
        "speed": 숫자,
        "durability": 숫자,
        "power": 숫자,
        "combat": 숫자,
        "total": 합계
      }
    }
  },
  "analysis": {
    "total_heroes": 517,
    "power_classification_summary": { ... },
    "hero_distribution": { ... }
  }
}
```

**사용 사례:**
- 개별 히어로의 상세 정보 조회
- 파워 세부 내용 검색
- 전체 Stats 기반 필터링

---

### 2. **heroes_sketch.json** (스케치용 경량 데이터)
시각화에 최적화된 간단한 포맷

**구조:**
```json
{
  "heroes": [
    {
      "name": "히어로명",
      "alignment": "good/bad",
      "total_stats": 합계,
      "physical": 피지컬 백분율,
      "mentality": 정신 백분율,
      "energy": 에너지 백분율,
      "power_count": 파워개수
    }
  ],
  "balanced_teams": {
    "physical_heavy": [...],
    "mentality_heavy": [...],
    "energy_heavy": [...],
    "balanced": [...]
  }
}
```

**사용 사례:**
- 간단한 히어로 목록 UI
- 빠른 필터링 (정렬, 검색)
- 팀 제안 표시

---

### 3. **heroes_network.json** (네트워크 시각화용)
유사도 기반 네트워크 그래프 데이터

**구조:**
```json
{
  "network": {
    "nodes": [
      { "id": 숫자, "name": "히어로명", "alignment": "good", 
        "total_stats": 합계, "physical": %, "mentality": %, "energy": %,
        "powerCount": 개수, "publisher": "출판사" }
    ],
    "edges": [
      { "source": 노드ID, "target": 노드ID, "weight": 유사도(0-1) }
    ],
    "nodeMap": { "히어로명": 노드ID, ... }
  },
  "teams": {
    "suggestions": [
      {
        "name": "팀 이름",
        "strategy": "전략 설명",
        "members": [...]
      }
    ]
  },
  "power_analysis": {
    "physical": [{ "power": "이름", "count": 개수, "percentage": % }],
    "mentality": [...],
    "energy": [...]
  },
  "statistics": {
    "power_distribution": { "physical": 373, "mentality": 55, "energy": 124, ... },
    "alignment_distribution": { "good": 숫자, "bad": 숫자, ... },
    "publisher_distribution": { "Marvel": 숫자, ... }
  }
}
```

**사용 사례:**
- D3.js/p5.js 네트워크 시각화
- 노드: 히어로, 엣지: 유사도
- 상호작용형 네트워크 탐색

---

## 📈 데이터 통계

### 파워 분류 결과
- **Physical Powers**: 37개 카테고리
- **Mentality Powers**: 24개 카테고리
- **Energy Powers**: 41개 카테고리
- **Unclassified**: 65개

### 히어로 분포
- **Physical 전문가**: 373명 (72.2%)
- **Energy 전문가**: 124명 (24.0%)
- **Mentality 전문가**: 55명 (10.6%)
- **균형형**: 7명 (1.4%)

### 상위 파워 (빈도 기준)
**Physical**: Super Strength (289명), Stamina (213명), Durability (201명)
**Mentality**: Intelligence (104명), Telepathy (75명), Telekinesis (44명)
**Energy**: Flight (174명), Energy Blasts (120명), Energy Absorption (60명)

---

## 🎯 sketch.js 활용 예제

### 1. 기본 네트워크 로드
```javascript
async function loadHeroNetwork() {
  const response = await fetch('data/heroes_network.json');
  const data = await response.json();
  
  const nodes = data.network.nodes;
  const edges = data.network.edges;
  const teams = data.teams.suggestions;
  
  return { nodes, edges, teams };
}
```

### 2. 히어로 검색
```javascript
function findHero(name) {
  const response = await fetch('data/heroes_combined.json');
  const data = await response.json();
  return data.heroes[name];
}
```

### 3. 유사 히어로 발견
```javascript
function findSimilarHeroes(heroName, limit = 5) {
  const response = await fetch('data/heroes_network.json');
  const data = await response.json();
  
  const nodeMap = data.network.nodeMap;
  const heroIndex = nodeMap[heroName];
  
  const similar = data.network.edges
    .filter(e => e.source === heroIndex || e.target === heroIndex)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit);
  
  return similar;
}
```

### 4. 팀 제안 표시
```javascript
function displayTeamSuggestions() {
  const response = await fetch('data/heroes_network.json');
  const data = await response.json();
  
  data.teams.suggestions.forEach(team => {
    console.log(`${team.name} (${team.strategy})`);
    team.members.forEach(member => {
      console.log(`  - ${member.name}: P(${member.physical}%) M(${member.mentality}%) E(${member.energy}%)`);
    });
  });
}
```

---

## 🛠️ 데이터 업데이트

CSV 파일을 수정한 후 데이터를 재생성하려면:

```bash
python process_heroes_data.py
python generate_network_analysis.py
```

---

## 📝 파워 분류 기준

### Physical 파워 (36개)
신체 능력, 움직임, 신체 내구력 관련
- 예: Super Strength, Agility, Speed, Durability, Stamina, Accelerated Healing, Enhanced Senses

### Mentality 파워 (24개)
정신력, 사고력, 감각 능력 관련
- 예: Intelligence, Telepathy, Telekinesis, Mind Control, Clairvoyance, Precognition

### Energy 파워 (41개)
에너지 조작, 원소 제어, 초자연적 능력 관련
- 예: Flight, Fire Control, Electrokinesis, Energy Blasts, Weather Control, Levitation

---

## 💡 활용 팁

1. **네트워크 시각화**: `heroes_network.json`의 nodes와 edges로 interactive 네트워크 그래프 구성
2. **필터링**: powerDistribution의 백분율로 파워 타입 필터 구현
3. **검색**: heroes_combined.json에서 name, race, publisher로 검색
4. **팀 생성**: 전문화별로 그룹화하여 밸런스 있는 팀 자동 제안
5. **비교**: 두 히어로의 stats와 power distribution을 나란히 비교

