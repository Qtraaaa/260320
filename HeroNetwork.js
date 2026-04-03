/**
 * Hero Network Visualization for p5.js/sketch.js
 * 생성된 JSON 데이터를 활용한 히어로 유사성 네트워크 시스템
 * 
 * 사용 가능한 데이터:
 * - heroes_combined.json: 전체 히어로 상세 정보
 * - heroes_network.json: 네트워크 그래프 + 팀 제안
 * - heroes_sketch.json: 경량 스케치 데이터
 */

class HeroNetwork {
  constructor() {
    this.heroesData = null;
    this.networkData = null;
    this.sketchData = null;
    this.selectedHero = null;
    this.highlightedNodes = []; // 유사 히어로들
  }

  /**
   * 데이터 로드
   */
  async loadData() {
    try {
      const combined = await fetch('data/heroes_combined.json').then(r => r.json());
      const network = await fetch('data/heroes_network.json').then(r => r.json());
      const sketch = await fetch('data/heroes_sketch.json').then(r => r.json());

      this.heroesData = combined.heroes;
      this.networkData = network;
      this.sketchData = sketch;

      console.log(`✓ 로드 완료: ${Object.keys(this.heroesData).length}명의 히어로`);
      return true;
    } catch (error) {
      console.error('데이터 로드 실패:', error);
      return false;
    }
  }

  /**
   * 히어로 정보 조회
   */
  getHero(name) {
    return this.heroesData[name];
  }

  /**
   * 히어로 목록 조회 (정렬 옵션)
   */
  getHeroList(sortBy = 'name') {
    const heroes = Object.entries(this.heroesData).map(([name, data]) => ({
      name: name,
      ...data
    }));

    switch (sortBy) {
      case 'totalStats':
        return heroes.sort((a, b) => b.stats.total - a.stats.total);
      case 'powerCount':
        return heroes.sort((a, b) => b.powerDistribution.totalPowers - a.powerDistribution.totalPowers);
      case 'physical':
        return heroes.sort((a, b) => b.powerDistribution.physical.percentage - a.powerDistribution.physical.percentage);
      case 'mentality':
        return heroes.sort((a, b) => b.powerDistribution.mentality.percentage - a.powerDistribution.mentality.percentage);
      case 'energy':
        return heroes.sort((a, b) => b.powerDistribution.energy.percentage - a.powerDistribution.energy.percentage);
      default:
        return heroes.sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  /**
   * 유사한 히어로 찾기
   */
  findSimilarHeroes(heroName, limit = 10) {
    const nodeMap = this.networkData.network.nodeMap;
    const edges = this.networkData.network.edges;
    const nodes = this.networkData.network.nodes;

    const heroIndex = nodeMap[heroName];
    if (heroIndex === undefined) return [];

    // 연결된 에지 찾기
    const similar = edges
      .filter(e => e.source === heroIndex || e.target === heroIndex)
      .map(e => ({
        name: nodes[e.source === heroIndex ? e.target : e.source].name,
        similarity: e.weight,
        node: nodes[e.source === heroIndex ? e.target : e.source]
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return similar;
  }

  /**
   * 파워로 히어로 필터링
   */
  filterByPower(power) {
    return Object.entries(this.heroesData)
      .filter(([name, data]) => data.powers.all.includes(power))
      .map(([name, data]) => ({ name, ...data }));
  }

  /**
   * 파워 분포로 필터링
   */
  filterByDistribution(minPhysical = 0, minMentality = 0, minEnergy = 0) {
    return Object.entries(this.heroesData)
      .filter(([name, data]) => {
        const dist = data.powerDistribution;
        return dist.physical.percentage >= minPhysical &&
               dist.mentality.percentage >= minMentality &&
               dist.energy.percentage >= minEnergy;
      })
      .map(([name, data]) => ({ name, ...data }));
  }

  /**
   * 통계 정보 조회
   */
  getStatistics() {
    return this.networkData.statistics;
  }

  /**
   * 팀 제안 조회
   */
  getTeamSuggestions() {
    return this.networkData.teams.suggestions;
  }

  /**
   * 파워 분석 조회
   */
  getPowerAnalysis() {
    return this.networkData.power_analysis;
  }

  /**
   * 네트워크 노드 및 에지 조회
   */
  getNetworkData() {
    return {
      nodes: this.networkData.network.nodes,
      edges: this.networkData.network.edges,
      nodeMap: this.networkData.network.nodeMap
    };
  }

  /**
   * 히어로 비교
   */
  compareHeroes(name1, name2) {
    const h1 = this.getHero(name1);
    const h2 = this.getHero(name2);

    if (!h1 || !h2) return null;

    return {
      hero1: {
        name: name1,
        stats: h1.stats,
        distribution: h1.powerDistribution,
        commonPowers: h1.powers.all.filter(p => h2.powers.all.includes(p)),
        uniquePowers: h1.powers.all.filter(p => !h2.powers.all.includes(p))
      },
      hero2: {
        name: name2,
        stats: h2.stats,
        distribution: h2.powerDistribution,
        commonPowers: h2.powers.all.filter(p => h1.powers.all.includes(p)),
        uniquePowers: h2.powers.all.filter(p => !h1.powers.all.includes(p))
      }
    };
  }

  /**
   * 팀 구성 (임의의 히어로 선택으로 밸런스 팀 구성)
   */
  buildBalancedTeam(teamSize = 6) {
    const heroes = this.getHeroList('totalStats');
    const team = [];
    const specs = { physical: 0, mentality: 0, energy: 0, balanced: 0 };
    const specLimits = {
      physical: Math.ceil(teamSize * 0.5),
      mentality: Math.ceil(teamSize * 0.2),
      energy: Math.ceil(teamSize * 0.3),
      balanced: Math.ceil(teamSize * 0.1)
    };

    for (const hero of heroes) {
      if (team.length >= teamSize) break;

      const dist = hero.powerDistribution;
      const max = Math.max(dist.physical.percentage, dist.mentality.percentage, dist.energy.percentage);
      let spec = 'balanced';

      if (max >= 40) {
        if (dist.physical.percentage === max) spec = 'physical';
        else if (dist.mentality.percentage === max) spec = 'mentality';
        else spec = 'energy';
      }

      if (specs[spec] < specLimits[spec]) {
        team.push(hero);
        specs[spec]++;
      }
    }

    return team;
  }

  /**
   * 특정 조건으로 히어로 검색
   */
  search(query) {
    const lowerQuery = query.toLowerCase();
    const results = [];

    // 이름으로 검색
    for (const [name, data] of Object.entries(this.heroesData)) {
      if (name.toLowerCase().includes(lowerQuery)) {
        results.push({ name, ...data, matchType: 'name' });
      }
    }

    // 파워로 검색
    for (const [name, data] of Object.entries(this.heroesData)) {
      if (data.powers.all.some(p => p.toLowerCase().includes(lowerQuery))) {
        // 이미 이름으로 추가되지 않았으면 추가
        if (!results.find(r => r.name === name)) {
          results.push({ name, ...data, matchType: 'power' });
        }
      }
    }

    return results;
  }
}

/**
 * 사용 예시
 */
async function initializeHeroNetwork() {
  const network = new HeroNetwork();
  
  if (!await network.loadData()) {
    console.error('네트워크 초기화 실패');
    return null;
  }

  // 예시 1: 상위 10명 히어로
  // const topHeroes = network.getHeroList('totalStats').slice(0, 10);

  // 예시 2: "Spider-Man"과 유사한 히어로 찾기
  // const similar = network.findSimilarHeroes('Spider-Man', 5);

  // 예시 3: Flight 파워를 가진 히어로들
  // const flyers = network.filterByPower('Flight');

  // 예시 4: 두 히어로 비교
  // const comparison = network.compareHeroes('Spider-Man', 'Wolverine');

  // 예시 5: 밸런스 팀 구성
  // const team = network.buildBalancedTeam(6);

  // 예시 6: 네트워크 데이터로 D3/p5 시각화
  // const { nodes, edges } = network.getNetworkData();

  return network;
}

/**
 * p5.js 연동 예제
 */
function setup() {
  createCanvas(1200, 800);

  // 네트워크 초기화
  initializeHeroNetwork().then(network => {
    if (network) {
      // 여기서 네트워크 시각화 코드 작성
      // const { nodes, edges } = network.getNetworkData();
      // drawNetwork(nodes, edges);
    }
  });
}

function draw() {
  background(240);
  // 시각화 업데이트 코드
}
