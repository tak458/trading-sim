import { Tile } from "./map";
import { Village } from "./village";
import Delaunator from "delaunator";

// 道コスト・道寄りバイアスの調整用パラメータ
const ROAD_COST = 0.1;          // 道そのもののコスト
const NEAR_ROAD_BONUS = 0.2;    // 道に隣接している場合の割引（例: land=1 → 0.8）

export interface Road {
  a: Village;
  b: Village;
  path: { x: number; y: number }[];
  usage: number;
  decay: number;
}

// buildRoads内の経路生成をA*に変更
export function buildRoads(map: Tile[][], villages: Village[]): Road[] {
  const roads: Road[] = [];
  const delaunayPairs = getDelaunayVillagePairs(villages);
  // 既存道路を記録する2次元配列
  const roadMask: boolean[][] = Array.from({ length: map.length }, () => Array(map.length).fill(false));

  // 既存の道を反映する関数
  function markRoad(path: { x: number; y: number }[]) {
    for (const p of path) {
      roadMask[p.y][p.x] = true;
    }
  }

  for (const [villageA, villageB] of delaunayPairs) {
    const existingRoad = roads.find(road =>
      (road.a === villageA && road.b === villageB) ||
      (road.a === villageB && road.b === villageA)
    );
    if (!existingRoad) {
      // 既存道路を優遇するA*
      const path = astarPathWithRoad(map, { x: villageA.x, y: villageA.y }, { x: villageB.x, y: villageB.y }, roadMask);
      roads.push({ a: villageA, b: villageB, path, usage: 0, decay: 0 });
      markRoad(path);
    }
  }
  return roads;
}

export function updateRoads(roads: Road[]) {
  for (const road of roads) {
    road.decay++;
    if (road.decay > 100) {
      road.usage = Math.max(0, road.usage - 1);
      road.decay = 0;
    }
  }
}

function getTileCost(tile: Tile, map: Tile[][], x: number, y: number): number {
  const near = isNearRoad(map, x, y);

  switch (tile.type) {
    case "water": return Infinity; // 通行不可
    case "road": return ROAD_COST; // 既存の道は極端に安い
    case "land": return near ? 1 - NEAR_ROAD_BONUS : 1;
    case "forest": return near ? 2 - NEAR_ROAD_BONUS : 2;
    case "mountain": return near ? 3 - NEAR_ROAD_BONUS : 3;
  }
}

// 既存道路を優遇するA*探索
function astarPathWithRoad(map: Tile[][], start: { x: number; y: number }, goal: { x: number; y: number }, roadMask: boolean[][]): { x: number; y: number }[] {
  const size = map.length;
  const open: { x: number; y: number; g: number; f: number; parent?: { x: number; y: number } }[] = [];
  const closed = new Set<string>();
  function key(x: number, y: number) { return `${x},${y}`; }
  open.push({ x: start.x, y: start.y, g: 0, f: Math.abs(goal.x - start.x) + Math.abs(goal.y - start.y) });
  const cameFrom = new Map<string, { x: number; y: number }>();
  const gScore = new Map<string, number>();
  gScore.set(key(start.x, start.y), 0);
  while (open.length > 0) {
    open.sort((a, b) => a.f - b.f);
    const current = open.shift()!;
    if (current.x === goal.x && current.y === goal.y) {
      // reconstruct path
      const path = [];
      let cur: { x: number; y: number } | undefined = { x: goal.x, y: goal.y };
      while (cur) {
        path.push(cur);
        cur = cameFrom.get(key(cur.x, cur.y));
      }
      return path.reverse();
    }
    closed.add(key(current.x, current.y));
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = current.x + dx, ny = current.y + dy;
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
      const neighborKey = key(nx, ny);
      if (closed.has(neighborKey)) continue;
      const tile = map[ny][nx];
      let cost = getTileCost(tile, map, nx, ny);
      // 既存道路ならコストを大幅に下げる
      if (roadMask[ny][nx]) cost *= 0.2;
      if (!isFinite(cost)) continue;
      const tentativeG = (gScore.get(key(current.x, current.y)) ?? Infinity) + cost;
      if (tentativeG < (gScore.get(neighborKey) ?? Infinity)) {
        cameFrom.set(neighborKey, { x: current.x, y: current.y });
        gScore.set(neighborKey, tentativeG);
        const f = tentativeG + Math.abs(goal.x - nx) + Math.abs(goal.y - ny);
        open.push({ x: nx, y: ny, g: tentativeG, f });
      }
    }
  }
  return [];
}

/**
 * ドロネー三角形分割で村ペアを抽出
 */
function getDelaunayVillagePairs(villages: Village[]): [Village, Village][] {
  if (villages.length < 2) return [];
  const points = villages.map(v => [v.x, v.y]);
  const delaunay = Delaunator.from(points);
  const edges = new Set<string>();
  const pairs: [Village, Village][] = [];
  for (let i = 0; i < delaunay.triangles.length; i += 3) {
    const tri = [
      delaunay.triangles[i],
      delaunay.triangles[i + 1],
      delaunay.triangles[i + 2],
    ];
    for (let j = 0; j < 3; j++) {
      const a = tri[j], b = tri[(j + 1) % 3];
      const key = a < b ? `${a},${b}` : `${b},${a}`;
      if (!edges.has(key)) {
        edges.add(key);
        pairs.push([villages[a], villages[b]]);
      }
    }
  }
  return pairs;
}

function isNearRoad(map: Tile[][], x: number, y: number): boolean {
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  for (const [dx, dy] of dirs) {
    const nx = x + dx, ny = y + dy;
    if (map[ny] && map[ny][nx] && map[ny][nx].type === "road") {
      return true;
    }
  }
  return false;
}
