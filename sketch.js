/**
 * Hero Network Donut Layout Visualization
 * 요구사항:
 * 1. 히어로를 점으로 표현
 * 2. 도넛 형태 영역에 배치
 * 3. 겹치지 않게 배치
 * 4. 파워 속성별 색상 (red/blue/yellow)
 * 5. alignment별로 뭉쳐있음
 * 6. 같은 종족끼리 선으로 연결 (높은 투명도)
 * 7. 호버 상호작용
 */

let nodes = [];
let edges = [];
let allPowerEdges = []; // 모든 파워 기반 edges (필터링 전)
let heroMap = {};

let center;
let outerRadius;
let innerRadius;

let hoveredNode = null;
let connectedNodes = new Set();

let ALIGNMENT_ANGLES = {};
let STAT_RADIAL_BANDS = {}; // stat별 반지름 밴드 { rMin, rMax }

// ⚙️ 파워 타입 가중치 (Physical 집중도 완화)
let POWER_WEIGHTS = {
  physical: 0.75,   // 낮춤 (physical 집중 방지)
  mentality: 1.2,   // 높임
  energy: 1.2       // 높임
};

// 🔍 마우스 렌즈 효과 설정
let LENS_RADIUS = 180;
let LENS_STRENGTH = 70;
let LENS_EASE = 0.16;

// ⚙️ 충돌 감지 알고리즘 설정
let MIN_NODE_DISTANCE = 24; // 노드 간 최소 거리 (픽셀)
let MAX_COLLISION_ITERATIONS = 10; // 충돌 해결 반복 횟수

function preload() {
  try {
    console.log("📂 데이터 로드 시작...");
    
    data = loadJSON("data/heroes_network.json");
    console.log("✓ heroes_network.json 로드됨");
    console.log("  - 구조:", Object.keys(data));
    
    // heroes_combined 데이터도 로드
    console.log("📂 heroes_combined.json 로드 중...");
    const combined = loadJSON("data/heroes_combined.json");
    console.log("✓ heroes_combined.json 로드됨");
    console.log("  - 타입:", typeof combined);
    console.log("  - 최상위 키:", combined ? Object.keys(combined) : "없음");
    console.log("  - 전체 구조:", combined);
    
    if (!combined) {
      console.error("❌ combined 객체가 null/undefined입니다");
      data.combined_heroes = {};
      return;
    }
    
    // heroes 객체 찾기
    if (combined.heroes && typeof combined.heroes === 'object') {
      data.combined_heroes = combined.heroes;
      console.log(`✓ data.combined_heroes 할당 완료 (${Object.keys(combined.heroes).length}명)`);
    } else if (Object.keys(combined).some(key => typeof combined[key] === 'object' && Object.keys(combined[key]).length > 100)) {
      // heroes인 것 같은 큰 객체 찾기
      for (let key of Object.keys(combined)) {
        if (typeof combined[key] === 'object' && Object.keys(combined[key]).length > 100) {
          data.combined_heroes = combined[key];
          console.log(`✓ heroes를 "${key}"에서 찾음 (${Object.keys(combined[key]).length}명)`);
          return;
        }
      }
      data.combined_heroes = combined;
    } else {
      console.error(`❌ combined.heroes 없음. 최상위 키:`, Object.keys(combined));
      data.combined_heroes = combined;
    }
  } catch (e) {
    console.error("❌ 데이터 로드 실패:", e);
    data = { network: { nodes: [], edges: [] } };
    data.combined_heroes = {};
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // p5.js canvas를 p5-container에 추가
  let container = document.getElementById('p5-container');
  let p5Canvas = document.querySelector('canvas');
  if (container && p5Canvas) {
    container.insertBefore(p5Canvas, container.firstChild);
    p5Canvas.style.display = 'block';
  }
  
  console.log("=== setup() 시작 ===");
  console.log("Canvas 생성됨:", p5Canvas ? "YES" : "NO");
  console.log("data 존재?", !!data);
  console.log("data.network 존재?", !!data?.network);
  
  if (!data || !data.network) {
    console.error("❌ 데이터 로드 실패!");
    fill(255);
    textSize(16);
    text("데이터 로드 실패", 20, 20);
    return;
  }

  console.log("✓ 데이터 로드 성공, 노드 수:", data.network.nodes.length);

  center = createVector(width / 2, height / 2);
  outerRadius = min(width, height) * 0.45;
  innerRadius = outerRadius * 0.3;

  initializeNetwork();
  
  console.log("✓ 네트워크 초기화 완료");
  console.log("  - nodes:", nodes.length);
  console.log("  - allPowerEdges:", allPowerEdges.length);
  console.log("  - 현재 필터링된 edges:", edges.length);
  console.log("");
  console.log("⚙️ 파워 타입 가중치:");
  console.log(`  - Physical: ${POWER_WEIGHTS.physical}`);
  console.log(`  - Mentality: ${POWER_WEIGHTS.mentality}`);
  console.log(`  - Energy: ${POWER_WEIGHTS.energy}`);
  console.log("");
  console.log("💡 팁: 브라우저 Console에서 다음 명령으로 가중치를 조정할 수 있습니다:");
  console.log("  POWER_WEIGHTS.physical = 0.8;");
  
  loop();
}

/**
 * 네트워크 초기화
 */
function initializeNetwork() {
  const networkData = data.network;
  const combinedHeroes = data.combined_heroes || {};
  const heroLookup = combinedHeroes.heroes || combinedHeroes;
  const statKeys = ['intelligence', 'strength', 'speed', 'durability', 'power', 'combat'];

  // 메인 스탯을 절대값이 아닌 상대적 강점(z-score)으로 계산하기 위한 기준선
  const statValues = {
    intelligence: [],
    strength: [],
    speed: [],
    durability: [],
    power: [],
    combat: []
  };

  networkData.nodes.forEach(n => {
    const heroStats = heroLookup[n.name]?.stats;
    if (!heroStats) return;

    statKeys.forEach(key => {
      const value = heroStats[key];
      if (typeof value === 'number' && !isNaN(value)) {
        statValues[key].push(value);
      }
    });
  });

  const statBaselines = {};
  statKeys.forEach(key => {
    const values = statValues[key];
    if (values.length === 0) {
      statBaselines[key] = { mean: 0, std: 1 };
      return;
    }

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance) || 1;
    statBaselines[key] = { mean, std };
  });

  // 1️⃣ 노드 생성 및 도넛 형태 배치
  nodes = networkData.nodes.map((n, idx) => {
    const alignment = (n.alignment || 'neutral').toLowerCase();
    
    // 6개 stat 중 가장 높은 것 찾기
    let dominantStat = 'balanced';
    
    // combinedHeroes가 heroes 객체를 직접 가리키지 않을 수 있으므로 안전하게 접근
    let heroData = heroLookup[n.name];
    const heroStats = heroData?.stats;
    
    if (heroStats) {
      const stats = {
        intelligence: heroStats.intelligence || 0,
        strength: heroStats.strength || 0,
        speed: heroStats.speed || 0,
        durability: heroStats.durability || 0,
        power: heroStats.power || 0,
        combat: heroStats.combat || 0
      };
      
      // 상대적 강점(z-score)이 가장 큰 stat 선택
      let maxScore = -Infinity;
      for (let [statName, value] of Object.entries(stats)) {
        const baseline = statBaselines[statName] || { mean: 0, std: 1 };
        const score = (value - baseline.mean) / baseline.std;
        if (score > maxScore) {
          maxScore = score;
          dominantStat = statName;
        }
      }

      // 모든 스탯이 0인 경우는 balanced 처리
      const statSum = Object.values(stats).reduce((a, b) => a + b, 0);
      if (statSum === 0) {
        dominantStat = 'balanced';
      }
    }
    
    // 색상 결정 (6가지 stat 기반)
    const mainColor = getStatColor(dominantStat);
    
    // 안전성 체크: 색상이 배열인지 확인
    if (!Array.isArray(mainColor)) {
      console.error(`⚠️ ${n.name}: 색상이 배열이 아닙니다!`, mainColor);
    }

    return {
      id: idx,
      name: n.name,
      alignment: alignment,
      race: n.race || 'Unknown',
      physical: n.physical,
      mentality: n.mentality,
      energy: n.energy,
      dominantPowerType: getDominantPowerType(n.physical, n.mentality, n.energy),
      totalStats: n.totalStats,
      powerCount: n.powerCount,
      publisher: n.publisher,
      dominantStat: dominantStat,
      
      // 위치 (후속 단계에서 업데이트)
      x: center.x,
      y: center.y,
      
      // 시각화
      color: mainColor || [150, 150, 150],  // 기본값
      size: 0 // totalStats에 비례하여 계산 (아래 참고)
    };
  });

  // totalStats의 최소/최대값 구하기
  const totalStatsValues = nodes
    .map(n => n.totalStats)
    .filter(val => val !== undefined && val !== null && !isNaN(val));
  
  if (totalStatsValues.length > 0) {
    const minStats = Math.min(...totalStatsValues);
    const maxStats = Math.max(...totalStatsValues);
    
    console.log(`📊 Total Stats 범위: [${minStats.toFixed(1)}, ${maxStats.toFixed(1)}]`);
    
    // 각 노드의 크기를 totalStats에 비례하여 계산
    nodes.forEach(node => {
      if (node.totalStats !== undefined && node.totalStats !== null) {
        node.size = map(node.totalStats, minStats, maxStats, 4, 16);
      } else {
        node.size = 8; // 기본값
      }
    });
    
    // 6가지 stat별 분포 출력
    const statCounts = {};
    nodes.forEach(node => {
      const stat = node.dominantStat;
      statCounts[stat] = (statCounts[stat] || 0) + 1;
    });
    console.log(`📊 Dominant Stat 분포:`, statCounts);
  } else {
    console.warn("⚠️ totalStats 데이터가 없습니다. 기본 크기 사용");
    nodes.forEach(node => {
      node.size = 8;
    });
  }

  // 2️⃣ Alignment 그룹별 비율에 따라 각도 영역 동적 할당
  calculateAlignmentAngles(nodes);

  // 2-1️⃣ Alignment 섹터 내에서 dominantStat별 서브섹터 계산
  calculateStatSubSectors(nodes);

  // 3️⃣ 노드 위치 계산 (alignment + dominantStat 서브섹터 기준)
  nodes.forEach(node => {
    const pos = getDonutPosition(node.alignment, node.dominantStat);
    node.x = pos.x;
    node.y = pos.y;
  });

  // 노드 맵 생성
  nodes.forEach(n => {
    heroMap[n.name] = n;
  });

  // 2️⃣ 엣지 생성: 같은 대표 stat + 같은 power 구분 + 같은 종족
  allPowerEdges = [];

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const n1 = nodes[i];
      const n2 = nodes[j];
      const sameDominantStat = n1.dominantStat === n2.dominantStat;
      const samePowerType = n1.dominantPowerType === n2.dominantPowerType;
      const race1 = String(n1.race || '').trim().toLowerCase();
      const race2 = String(n2.race || '').trim().toLowerCase();
      const race1Known = race1 !== '' && race1 !== 'unknown';
      const race2Known = race2 !== '' && race2 !== 'unknown';
      const sameRace = race1Known && race2Known && race1 === race2;

      if (sameDominantStat && samePowerType && sameRace) {
        allPowerEdges.push({
          source: n1,
          target: n2,
          type: 'statPower',
          dominantStat: n1.dominantStat,
          dominantPowerType: n1.dominantPowerType,
          weight: 1
        });
      }
    }
  }

  edges = allPowerEdges;

  if (allPowerEdges.length === 0) {
    console.warn(`⚠️ 조건(같은 대표 stat + 같은 power 구분)으로 생성된 엣지가 없습니다.`);
  }

  // ⚙️ 충돌 감지 및 해결
  resolveNodeCollisions();

  // 기본 배치 좌표(home)와 렌더 좌표(render) 초기화
  nodes.forEach(node => {
    node.homeX = node.x;
    node.homeY = node.y;
    node.renderX = node.x;
    node.renderY = node.y;
  });

  console.log(`✓ 네트워크 초기화 완료`);
  console.log(`  - 노드: ${nodes.length}`);
  console.log(`  - 조건 기반 edges: ${allPowerEdges.length}`);
  console.log(`  - 최소 노드 거리: ${MIN_NODE_DISTANCE}px`);
}

/**
 * 노드 간 충돌 감지 및 해결
 * 겹치는 노드들을 밀어내서 최소 거리 유지
 */
function resolveNodeCollisions() {
  for (let iter = 0; iter < MAX_COLLISION_ITERATIONS; iter++) {
    let hasCollision = false;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const n1 = nodes[i];
        const n2 = nodes[j];
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const distance = sqrt(dx * dx + dy * dy);
        const minDist = MIN_NODE_DISTANCE + (n1.size + n2.size) / 2;

        if (distance < minDist) {
          hasCollision = true;
          
          // 두 노드를 밀어냄
          const angle = atan2(dy, dx);
          const overlap = minDist - distance;
          const pushDistance = overlap / 2 + 0.5; // 약간 더 밀어냄

          n1.x -= cos(angle) * pushDistance;
          n1.y -= sin(angle) * pushDistance;
          n2.x += cos(angle) * pushDistance;
          n2.y += sin(angle) * pushDistance;

          // 도넛 영역 내로 유지
          constrainNodeToDonut(n1);
          constrainNodeToDonut(n2);
        }
      }
    }

    // 충돌이 없으면 종료
    if (!hasCollision) {
      console.log(`✓ 노드 충돌 해결 완료 (${iter}회 반복)`);
      break;
    }
  }
}

/**
 * 노드를 도넛 영역 내로 제한
 */
function constrainNodeToDonut(node) {
  const dx = node.x - center.x;
  const dy = node.y - center.y;
  const distance = sqrt(dx * dx + dy * dy);

  // 도넛 영역 내로 조정
  if (distance > outerRadius) {
    const scale = outerRadius / distance;
    node.x = center.x + dx * scale;
    node.y = center.y + dy * scale;
  } else if (distance < innerRadius) {
    const scale = innerRadius / distance;
    node.x = center.x + dx * scale;
    node.y = center.y + dy * scale;
  }
}

/**
 * Alignment 비율에 따라 각도 영역 동적 계산 (그룹 간 갭 포함)
 */
function calculateAlignmentAngles(nodeList) {
  // 각 alignment 그룹의 노드 개수 세기
  const alignCounts = {};
  const totalNodes = nodeList.length;
  
  nodeList.forEach(node => {
    alignCounts[node.alignment] = (alignCounts[node.alignment] || 0) + 1;
  });

  // 정렬 순서 고정: good → bad → neutral
  const ORDER = ['good', 'bad', 'neutral', 'anti-hero'];
  const alignments = Object.keys(alignCounts).sort((a, b) => {
    return ORDER.indexOf(a) - ORDER.indexOf(b);
  });

  // 그룹 간 갭 설정
  const GAP_ANGLE = PI / 12; // 15도 갭
  const totalGap = alignments.length * GAP_ANGLE;
  const availableAngle = 2 * PI - totalGap; // 갭을 제외한 사용 가능한 각도

  // 각 alignment에 할당할 각도 범위 계산
  let currentAngle = -PI / 2; // 상단부터 시작
  
  alignments.forEach((align, idx) => {
    const count = alignCounts[align];
    const proportion = count / totalNodes;
    const angleRange = availableAngle * proportion; // 사용 가능한 각도 중 비율만큼
    
    const start = currentAngle;
    const end = currentAngle + angleRange;
    
    ALIGNMENT_ANGLES[align] = { start, end };
    
    console.log(`  📍 ${align}: ${count}명 (${(proportion * 100).toFixed(1)}%) | ${(start * 180 / PI).toFixed(0)}° ~ ${(end * 180 / PI).toFixed(0)}°`);
    
    currentAngle = end + GAP_ANGLE; // 다음 그룹 시작 전 갭 추가
  });

  // anti-hero가 없으면 neutral과 동일하게 설정
  if (!ALIGNMENT_ANGLES['anti-hero']) {
    ALIGNMENT_ANGLES['anti-hero'] = ALIGNMENT_ANGLES['neutral'];
  }

  console.log(`  🔲 그룹 간 갭: ${(GAP_ANGLE * 180 / PI).toFixed(0)}도`);
}

/**
 * 각 dominantStat에 내부~외부 선상의 반지름 밴드를 할당
 * (전체 노드 비율 기준 / alignment 공통 적용)
 */
function calculateStatSubSectors(nodeList) {
  // 고정 순서: 내부 → 외부 링 순서
  const STAT_ORDER = ['combat', 'durability', 'intelligence', 'power', 'speed', 'strength', 'balanced'];

  // 전체 노드에서 stat별 개수 집계
  const statCounts = {};
  nodeList.forEach(node => {
    const stat = node.dominantStat;
    statCounts[stat] = (statCounts[stat] || 0) + 1;
  });

  const totalNodes = nodeList.length;
  const BAND_GAP = 6; // 밴드 사이 픽셀 갭
  const totalRadial = outerRadius - innerRadius;

  // 실제 존재하는 stat만 순서대로 사용
  const presentStats = STAT_ORDER.filter(s => statCounts[s] > 0);
  const totalGap = (presentStats.length - 1) * BAND_GAP;
  const availableRadial = totalRadial - totalGap;

  let currentR = innerRadius;
  presentStats.forEach(stat => {
    const proportion = (statCounts[stat] || 0) / totalNodes;
    const bandWidth = Math.max(availableRadial * proportion, 10); // 최소 10px
    STAT_RADIAL_BANDS[stat] = { rMin: currentR, rMax: currentR + bandWidth };
    currentR += bandWidth + BAND_GAP;
  });

  console.log('📏 Stat 반지름 밴드:', Object.entries(STAT_RADIAL_BANDS)
    .map(([s, b]) => `${s}: ${b.rMin.toFixed(0)}~${b.rMax.toFixed(0)}`).join(', '));
}

/**
 * 도넛 형태 위치 계산
 */
function getDonutPosition(alignment, dominantStat) {
  // alignment 전체 각도 범위 사용 (각도 분할 없음)
  const angles = ALIGNMENT_ANGLES[alignment] || ALIGNMENT_ANGLES['neutral'];
  const angle = random(angles.start, angles.end);

  // dominantStat의 반지름 밴드 사용
  const band = STAT_RADIAL_BANDS[dominantStat];
  const r = band ? random(band.rMin, band.rMax) : random(innerRadius, outerRadius);

  return createVector(
    center.x + cos(angle) * r,
    center.y + sin(angle) * r
  );
}

/**
 * physical / mentality / energy 중 가장 높은 대표 구분값 반환
 */
function getDominantPowerType(physical, mentality, energy) {
  const p = typeof physical === 'number' ? physical : 0;
  const m = typeof mentality === 'number' ? mentality : 0;
  const e = typeof energy === 'number' ? energy : 0;

  if (p >= m && p >= e) return 'physical';
  if (m >= p && m >= e) return 'mentality';
  return 'energy';
}

/**
 * 파워 속성별 색상 결정 (가중치 적용)
 * physical (적색) / mentality (청색) / energy (황색)
 */
/**
 * 6가지 Stat 기반 색상 결정 (RGB 배열)
 * Intelligence → 파란색
 * Strength → 빨간색
 * Speed → 노란색
 * Durability → 초록색
 * Power → 보라색
 * Combat → 주황색
 */
function getStatColor(statName) {
  switch (statName) {
    case 'intelligence':
      return [100, 150, 255];    // 밝은 파란색
    case 'strength':
      return [255, 80, 80];      // 빨간색
    case 'speed':
      return [255, 220, 60];     // 노란색
    case 'durability':
      return [100, 200, 100];    // 초록색
    case 'power':
      return [200, 80, 255];     // 보라색
    case 'combat':
      return [255, 160, 80];     // 주황색
    default:
      return [150, 150, 150];    // 회색 (균형/미분류)
  }
}

/**
 * Alignment별 후광 색상 결정 (RGB 배열)
 */
function getGlowColor(alignment) {
  let alignStr = String(alignment || '').toLowerCase().trim();
  
  // 문자열 처리 (가장 기본적인 경우)
  switch (alignStr) {
    case 'good':
      return [100, 200, 100];  // 녹색
    case 'bad':
      return [200, 100, 100];  // 적색
    case 'neutral':
    case 'anti-hero':
      return [255, 200, 100];  // 황색
    default:
      return [150, 150, 150];  // 회색
  }
}

/**
 * 마우스 렌즈 효과로 노드 렌더 좌표 업데이트
 */
function updateLensDeformation() {
  let closestNode = null;
  let closestDistance = Infinity;
  const snapRadius = LENS_RADIUS * 0.5;

  // 렌즈 반경 안에서 마우스에 가장 가까운 노드 1개 선택
  nodes.forEach(node => {
    const homeX = node.homeX ?? node.x;
    const homeY = node.homeY ?? node.y;
    const dx = homeX - mouseX;
    const dy = homeY - mouseY;
    const d = sqrt(dx * dx + dy * dy);

    if (d < snapRadius && d < closestDistance) {
      closestDistance = d;
      closestNode = node;
    }
  });

  nodes.forEach(node => {
    const homeX = node.homeX ?? node.x;
    const homeY = node.homeY ?? node.y;

    let targetX = homeX;
    let targetY = homeY;

    if (node === closestNode) {
      node.renderX = mouseX;
      node.renderY = mouseY;
      return;
    }

    const dx = homeX - mouseX;
    const dy = homeY - mouseY;
    const d = sqrt(dx * dx + dy * dy);

    if (d < LENS_RADIUS) {
      // 마우스에 가까울수록 더 크게 밀려나는 비선형 반발
      const t = 1 - d / LENS_RADIUS;
      const push = LENS_STRENGTH * t * t;
      const nx = d > 0.001 ? dx / d : 1;
      const ny = d > 0.001 ? dy / d : 0;
      targetX = homeX + nx * push;
      targetY = homeY + ny * push;
    }

    const constrained = constrainPointToDonut(targetX, targetY, node.size * 0.5 + 2);
    node.renderX = lerp(node.renderX ?? homeX, constrained.x, LENS_EASE);
    node.renderY = lerp(node.renderY ?? homeY, constrained.y, LENS_EASE);
  });
}

/**
 * 임의 좌표를 도넛 영역 내로 제한
 */
function constrainPointToDonut(x, y, margin = 0) {
  const dx = x - center.x;
  const dy = y - center.y;
  const distance = sqrt(dx * dx + dy * dy);

  let minR = innerRadius + margin;
  let maxR = outerRadius - margin;

  if (maxR <= minR) {
    minR = innerRadius;
    maxR = outerRadius;
  }

  if (distance < 0.0001) {
    return createVector(center.x + minR, center.y);
  }

  if (distance > maxR) {
    const scale = maxR / distance;
    return createVector(center.x + dx * scale, center.y + dy * scale);
  }

  if (distance < minR) {
    const scale = minR / distance;
    return createVector(center.x + dx * scale, center.y + dy * scale);
  }

  return createVector(x, y);
}

function draw() {
  background(15, 15, 20);

  // 데이터가 없으면 대기 표시
  if (nodes.length === 0) {
    fill(255);
    textSize(20);
    textAlign(CENTER, CENTER);
    text("데이터 로드 중...", width / 2, height / 2);
    return;
  }

  // 마우스 렌즈 기반 렌더 좌표 업데이트
  updateLensDeformation();

  // 호버 노드 감지
  hoveredNode = null;
  for (let node of nodes) {
    const d = dist(mouseX, mouseY, node.renderX, node.renderY);
    if (d < node.size + 8) {
      hoveredNode = node;
      break;
    }
  }

  // 호버 노드와 연결된 노드들 찾기
  connectedNodes.clear();
  if (hoveredNode) {
    edges.forEach(e => {
      if (e.source === hoveredNode) connectedNodes.add(e.target);
      if (e.target === hoveredNode) connectedNodes.add(e.source);
    });
  }

  // 1️⃣ 엣지 그리기
  drawEdges();

  // 2️⃣ 노드 그리기
  drawNodes();

  // 3️⃣ 호버 정보
  if (hoveredNode) {
    drawHoverInfo(hoveredNode);
  }

  // 4️⃣ UI
  drawUI();

  // 5️⃣ 파워 비율 원 그래프 (우측 하단)
  drawPowerDistributionCharts();
}

/**
 * 엣지 그리기
 */
function drawEdges() {
  edges.forEach(edge => {
    const sx = edge.source.renderX ?? edge.source.x;
    const sy = edge.source.renderY ?? edge.source.y;
    const tx = edge.target.renderX ?? edge.target.x;
    const ty = edge.target.renderY ?? edge.target.y;
    const isStatPowerEdge = edge.type === 'statPower';
    
    if (hoveredNode) {
      // 호버 노드와 연결된 엣지 강조
      if (edge.source === hoveredNode || edge.target === hoveredNode) {
        if (isStatPowerEdge) {
          const edgeColor = getStatColor(edge.dominantStat);
          stroke(edgeColor[0], edgeColor[1], edgeColor[2], 190);
          strokeWeight(1.8);
        } else {
          stroke(100, 200, 255, 100);
          strokeWeight(1);
        }
      } else {
        // 다른 엣지는 거의 투명
        if (isStatPowerEdge) {
          stroke(140, 140, 140, 3);
          strokeWeight(0.5);
        } else {
          stroke(150, 150, 150, 2);
          strokeWeight(0.3);
        }
      }
    } else {
      // 기본 상태: 전체 라인은 회색
      stroke(145, 145, 145, 8);
      strokeWeight(0.7);
    }

    line(sx, sy, tx, ty);
  });
}

/**
 * 노드 그리기
 */
function drawNodes() {
  nodes.forEach(node => {
    const drawX = node.renderX ?? node.x;
    const drawY = node.renderY ?? node.y;
    const isHovered = (node === hoveredNode);
    const isConnected = connectedNodes.has(node);

    let nodeSize = node.size;

    // 사이즈 결정
    if (isHovered) {
      nodeSize *= 1.5;
    } else if (isConnected) {
      nodeSize *= 1.3;
    }

    // alignment별 후광 색상 (투명도 낮춤)
    let glowColor = getGlowColor(node.alignment);

    // 후광 그라데이션 (여러 반복으로 그라데이션 효과)
    for (let i = 40; i > 0; i -= 5) {
      let alpha = map(i, 40, 0, 0, 25);  // 투명도 낮춤 (60 → 25)
      fill(glowColor[0], glowColor[1], glowColor[2], alpha);
      noStroke();
      ellipse(drawX, drawY, nodeSize + i);
    }

    // 노드 원 - 색상 배열 사용
    fill(node.color[0], node.color[1], node.color[2]);
    noStroke();
    circle(drawX, drawY, nodeSize);

    // 테두리
    if (isHovered) {
      stroke(100, 200, 255, 255);
      strokeWeight(2.5);
      noFill();
      circle(drawX, drawY, nodeSize + 4);
    } else if (isConnected) {
      stroke(150, 200, 255, 150);
      strokeWeight(1.5);
      noFill();
      circle(drawX, drawY, nodeSize + 2);
    }
  });
}

/**
 * 호버 정보 팝업
 */
function drawHoverInfo(node) {
  const boxWidth = 240;
  const boxHeight = 180;
  let boxX = mouseX + 15;
  let boxY = mouseY + 15;

  // 화면 경계 체크
  if (boxX + boxWidth > width) boxX = mouseX - boxWidth - 15;
  if (boxY + boxHeight > height) boxY = mouseY - boxHeight - 15;

  // 배경
  fill(20, 25, 40, 250);
  stroke(100, 150, 255, 200);
  strokeWeight(1.5);
  rect(boxX, boxY, boxWidth, boxHeight, 8);

  // 텍스트
  noStroke();
  fill(255);
  textAlign(LEFT);
  textSize(12);
  textStyle(BOLD);

  let x = boxX + 12;
  let y = boxY + 14;
  const lineH = 16;

  text("🦸 " + node.name, x, y);

  textStyle(NORMAL);
  textSize(10);
  fill(200);
  y += lineH;

  text("종족: " + node.race, x, y);
  y += lineH;

  text("우호도: " + node.alignment, x, y);
  y += lineH;

  text("출판사: " + node.publisher, x, y);
  y += lineH + 2;

  // 메인 스탯 표시
  fill(255, 220, 100);
  textSize(11);
  textStyle(BOLD);
  const statLabel = {
    'intelligence': '🧠 지능',
    'strength': '💪 힘',
    'speed': '⚡ 속도',
    'durability': '🛡️ 견고성',
    'power': '✨ 파워',
    'combat': '⚔️ 전투력'
  };
  text("메인 스탯: " + (statLabel[node.dominantStat] || node.dominantStat), x, y);
  y += 14;

  // 파워 분포 바
  fill(255);
  textSize(11);
  textStyle(BOLD);
  text("⚡ 능력", x, y);
  y += 14;

  drawPowerBar(x, y, node);
  y += 45;

  textSize(10);
  fill(150, 200, 255);
  text(`파워 개수: ${node.powerCount}`, x, y);
}

/**
 * 파워 비율 원 그래프 (우측 하단)
 * 각 alignment별 Physical/Mentality/Energy 비율 시각화
 */
/**
 * 우측 하단 원형 그래프 (Stat 기반, 6가지 색상)
 */
function drawPowerDistributionCharts() {
  const alignments = ['good', 'bad', 'neutral'];
  
  // Stat 색상
  const statColors = {
    intelligence: [100, 150, 255],    // 파란색
    strength: [255, 80, 80],          // 빨간색
    speed: [255, 220, 60],            // 노란색
    durability: [100, 200, 100],      // 초록색
    power: [200, 80, 255],            // 보라색
    combat: [255, 160, 80],           // 주황색
    balanced: [150, 150, 150]         // 회색 (균형)
  };

  // 각 alignment별 dominantStat 분포 계산 (totalStats 가중치 적용)
  const statDistribution = {};
  alignments.forEach(align => {
    const alignNodes = nodes.filter(n => n.alignment === align);
    const statCounts = {};
    // 모든 stat 타입 초기화
    Object.keys(statColors).forEach(stat => {
      statCounts[stat] = 0;
    });
    // dominantStat별 totalStats 합산
    alignNodes.forEach(n => {
      const stat = n.dominantStat || 'balanced';
      const weight = (typeof n.totalStats === 'number' && !isNaN(n.totalStats)) ? n.totalStats : 1;
      statCounts[stat] = (statCounts[stat] || 0) + weight;
    });
    // 전체 합계 (가중치 총합)
    const total = Object.values(statCounts).reduce((a, b) => a + b, 0);
    statDistribution[align] = {
      counts: statCounts,
      total: total
    };
  });

  // 우측 하단에 원 그래프 그리기
  const startX = width - 380;
  const startY = height - 130;
  const chartSize = 50;
  const spacing = 130;

  alignments.forEach((align, idx) => {
    const x = startX + idx * spacing;
    const y = startY;
    const distribution = statDistribution[align];
    const total = distribution.total;

    if (total === 0) return;

    // Alignment 레이블 (한글 + 영문)
    const alignmentLabels = {
      good: '착함 (Good)',
      bad: '악함 (Bad)',
      neutral: '중립 (Neutral)'
    };
    
    fill(255);
    textAlign(CENTER);
    textSize(11);
    textStyle(BOLD);
    text(alignmentLabels[align], x, y - 70);

    // 원 그래프 배경 (회색 원)
    fill(50, 50, 60);
    noStroke();
    circle(x, y, chartSize * 2);

    // 각 stat 비율로 pie chart 그리기
    const statOrder = ['intelligence', 'strength', 'speed', 'durability', 'power', 'combat'];
    let currentAngle = -PI / 2;

    statOrder.forEach(statName => {
      const count = distribution.counts[statName] || 0;
      const ratio = count / total;
      
      if (ratio > 0) {
        const sliceColor = statColors[statName];
        drawPieSliceRGB(x, y, chartSize, currentAngle, currentAngle + ratio * 2 * PI, sliceColor);
        currentAngle += ratio * 2 * PI;
      }
    });

    // 범례 표시
    const labelY = y + chartSize + 30;
    textSize(7);
    textStyle(NORMAL);

    const labels1 = [
      { stat: 'I', key: 'intelligence' },
      { stat: 'S', key: 'strength' },
      { stat: 'Sp', key: 'speed' }
    ];
    const labels2 = [
      { stat: 'D', key: 'durability' },
      { stat: 'P', key: 'power' },
      { stat: 'C', key: 'combat' }
    ];

    labels1.forEach((label, i) => {
      const count = distribution.counts[label.key] || 0;
      const pct = ((count / total) * 100).toFixed(0);
      const col = statColors[label.key];
      fill(col[0], col[1], col[2]);
      text(`${label.stat}: ${pct}%`, x - 22 + i * 22, labelY);
    });

    labels2.forEach((label, i) => {
      const count = distribution.counts[label.key] || 0;
      const pct = ((count / total) * 100).toFixed(0);
      const col = statColors[label.key];
      fill(col[0], col[1], col[2]);
      text(`${label.stat}: ${pct}%`, x - 22 + i * 22, labelY + 10);
    });
  });
}

/**
 * RGB 배열 기반 Pie chart 슬라이스 그리기
 */
function drawPieSliceRGB(x, y, radius, startAngle, endAngle, rgbColor) {
  fill(rgbColor[0], rgbColor[1], rgbColor[2]);
  stroke(20, 25, 40);
  strokeWeight(1);
  beginShape();
  vertex(x, y);
  for (let angle = startAngle; angle <= endAngle; angle += 0.1) {
    const px = x + radius * cos(angle);
    const py = y + radius * sin(angle);
    vertex(px, py);
  }
  vertex(x, y);
  endShape(CLOSE);
}

/**
 * 파워 분포 바
 */
function drawPowerBar(x, y, node) {
  const barWidth = 180;
  const barHeight = 6;
  const spacing = 3;

  // Physical (빨강)
  fill(255, 60, 60);
  rect(x, y, (node.physical / 100) * barWidth, barHeight, 2);
  fill(150);
  textSize(9);
  text("P", x - 15, y + barHeight - 1);

  // Mentality (파랑)
  y += barHeight + spacing;
  fill(60, 100, 255);
  rect(x, y, (node.mentality / 100) * barWidth, barHeight, 2);
  fill(150);
  text("M", x - 15, y + barHeight - 1);

  // Energy (노랑)
  y += barHeight + spacing;
  fill(255, 180, 50);
  rect(x, y, (node.energy / 100) * barWidth, barHeight, 2);
  fill(150);
  text("E", x - 15, y + barHeight - 1);
}

/**
 * UI 정보 (우측 상단)
 */
function drawUI() {
  // 배경
  fill(20, 25, 40, 240);
  rect(width - 250, 10, 240, 160, 8);

  // 제목
  fill(255);
  textAlign(LEFT);
  textSize(12);
  textStyle(BOLD);
  text("📊 Hero Network", width - 240, 28);

  // 통계
  textStyle(NORMAL);
  textSize(10);
  fill(200);

  let y = 48;
  const lineH = 14;

  text(`총 히어로: ${nodes.length}`, width - 240, y);
  y += lineH;

  text(`엣지: ${edges.length}`, width - 240, y);
  y += lineH;

  // alignment 분포
  const alignCounts = {
    good: nodes.filter(n => n.alignment === 'good').length,
    bad: nodes.filter(n => n.alignment === 'bad').length,
    neutral: nodes.filter(n => n.alignment === 'neutral').length
  };

  text("우호도:", width - 240, y);
  y += lineH;

  textSize(9);
  fill(100, 200, 100);
  text(`Good: ${alignCounts.good}`, width - 235, y);
  y += lineH - 2;

  fill(200, 100, 100);
  text(`Bad: ${alignCounts.bad}`, width - 235, y);
  y += lineH - 2;

  fill(150, 150, 200);
  text(`Neutral: ${alignCounts.neutral}`, width - 235, y);

  // 범례
  y = 180;
  fill(20, 25, 40, 240);
  rect(width - 250, y, 240, 140, 8);

  fill(255);
  textAlign(LEFT);
  textSize(12);
  textStyle(BOLD);
  text("🎨 범례", width - 240, y + 18);

  textStyle(NORMAL);
  textSize(9);
  y += 38;

  // 색상 범례
  fill(255, 60, 60);
  circle(width - 230, y, 4);
  fill(180);
  text("Physical (강건 능력)", width - 220, y + 2);

  y += 14;
  fill(60, 100, 255);
  circle(width - 230, y, 4);
  fill(180);
  text("Mentality (정신 능력)", width - 220, y + 2);

  y += 14;
  fill(255, 180, 50);
  circle(width - 230, y, 4);
  fill(180);
  text("Energy (에너지 능력)", width - 220, y + 2);

  y += 14;
  fill(150, 150, 150);
  circle(width - 230, y, 4);
  fill(180);
  text("Balanced (균형형)", width - 220, y + 2);

  // alignment 범례
  y += 20;
  fill(255);
  textStyle(BOLD);
  text("Alignment + Glow", width - 240, y);

  y += 14;
  textStyle(NORMAL);
  textSize(8);
  
  // Good - 녹색
  fill(100, 200, 100, 150);
  ellipse(width - 230, y, 12);
  fill(160);
  text("Good (녹색 후광) ↑", width - 220, y + 2);
  
  y += 12;
  
  // Neutral - 황색
  fill(255, 200, 100, 150);
  ellipse(width - 230, y, 12);
  fill(160);
  text("Neutral (황색 후광) →", width - 220, y + 2);
  
  y += 12;
  
  // Bad - 적색
  fill(200, 100, 100, 150);
  ellipse(width - 230, y, 12);
  fill(160);
  text("Bad (적색 후광) ↓", width - 220, y + 2);
}

function windowResized() {
  if (windowWidth > 0 && windowHeight > 0) {
    resizeCanvas(windowWidth, windowHeight);
  }
}
