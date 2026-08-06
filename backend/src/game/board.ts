// ---- Mystery Mansion: board, cards, and movement graph ----
// Classic Cluedo-style mansion: 9 rooms, corridors, secret passages.

export interface RoomDef {
  id: string;      // also the room card id
  label: string;
  x: number;       // grid cell (column)
  y: number;       // grid cell (row)
}

export interface CorridorDef {
  id: string;
  x: number;
  y: number;
}

export const GRID_CELL = 90; // px per grid cell (used by the frontend renderer)

// 3x3 grid of rooms; rooms occupy one cell each. (grid 0..6, 7x7)
export const ROOMS: RoomDef[] = [
  { id: 'kitchen', label: 'Kitchen', x: 0, y: 0 },
  { id: 'ballroom', label: 'Ballroom', x: 3, y: 0 },
  { id: 'conservatory', label: 'Conservatory', x: 6, y: 0 },
  { id: 'dining_room', label: 'Dining Room', x: 0, y: 3 },
  { id: 'library', label: 'Library', x: 3, y: 3 },
  { id: 'billiard_room', label: 'Billiard Room', x: 6, y: 3 },
  { id: 'lounge', label: 'Lounge', x: 0, y: 6 },
  { id: 'hall', label: 'Hall', x: 3, y: 6 },
  { id: 'study', label: 'Study', x: 6, y: 6 },
];

export const ROOM_IDS = ROOMS.map(r => r.id);

// Corridor nodes placed between rooms.
export const CORRIDORS: CorridorDef[] = [
  { id: 'k_b', x: 1.5, y: 0 },   // kitchen - ballroom
  { id: 'b_c', x: 4.5, y: 0 },   // ballroom - conservatory
  { id: 'k_d', x: 0, y: 1.5 },   // kitchen - dining
  { id: 'b_d', x: 1.5, y: 1.5 }, // ballroom - dining
  { id: 'c_b', x: 4.5, y: 1.5 }, // conservatory - billiard
  { id: 'c_l', x: 4.5, y: 1.5 }, // conservatory - library (same spot, separate id ok)
  { id: 'd_l', x: 1.5, y: 3 },   // dining - library
  { id: 'l_b', x: 4.5, y: 3 },   // library - billiard
  { id: 'd_lg', x: 0, y: 4.5 },  // dining - lounge
  { id: 'lg_h', x: 1.5, y: 6 },  // lounge - hall
  { id: 'h_s', x: 4.5, y: 6 },   // hall - study
  { id: 'b_s', x: 6, y: 4.5 },   // billiard - study
  { id: 'l_s', x: 4.5, y: 4.5 }, // library - study
  { id: 's_b2', x: 4.5, y: 3 },  // library - billiard (spare)
];

// Starting squares (one per player up to 6).
export const START_SQUARES: CorridorDef[] = [
  { id: 'start0', x: 1.5, y: 0.5 },
  { id: 'start1', x: 4.5, y: 0.5 },
  { id: 'start2', x: 0.5, y: 1.5 },
  { id: 'start3', x: 6.5, y: 1.5 },
  { id: 'start4', x: 0.5, y: 4.5 },
  { id: 'start5', x: 6.5, y: 4.5 },
];

// Secret passages between rooms (Cluedo's diagonal shortcuts).
export const PASSAGES: Record<string, string> = {
  kitchen: 'study',
  study: 'kitchen',
  lounge: 'conservatory',
  conservatory: 'lounge',
};

// Graph edges (undirected). Passage edges are secret passages.
export const EDGES: [string, string, boolean?][] = [
  ['kitchen', 'k_b'],
  ['k_b', 'ballroom'],
  ['ballroom', 'b_c'],
  ['b_c', 'conservatory'],
  ['kitchen', 'k_d'],
  ['k_d', 'dining_room'],
  ['ballroom', 'b_d'],
  ['b_d', 'dining_room'],
  ['conservatory', 'c_b'],
  ['c_b', 'billiard_room'],
  ['conservatory', 'c_l'],
  ['c_l', 'library'],
  ['dining_room', 'd_l'],
  ['d_l', 'library'],
  ['library', 'l_b'],
  ['l_b', 'billiard_room'],
  ['dining_room', 'd_lg'],
  ['d_lg', 'lounge'],
  ['lounge', 'lg_h'],
  ['lg_h', 'hall'],
  ['hall', 'h_s'],
  ['h_s', 'study'],
  ['billiard_room', 'b_s'],
  ['b_s', 'study'],
  ['library', 'l_s'],
  ['l_s', 'study'],
  ['s_b2', 'library'],
  // secret passages
  ['kitchen', 'study', true],
  ['lounge', 'conservatory', true],
  // start squares connect to their nearest corridor
  ['start0', 'k_b'],
  ['start1', 'b_c'],
  ['start2', 'k_d'],
  ['start3', 'b_s'],
  ['start4', 'd_lg'],
  ['start5', 'b_s'],
];

export interface NodeDef {
  id: string;
  kind: 'room' | 'corridor' | 'start';
  label: string;
  x: number;
  y: number;
}

export const ALL_NODES: NodeDef[] = [
  ...ROOMS.map(r => ({ id: r.id, kind: 'room' as const, label: r.label, x: r.x, y: r.y })),
  ...CORRIDORS.map(c => ({ id: c.id, kind: 'corridor' as const, label: '', x: c.x, y: c.y })),
  ...START_SQUARES.map(s => ({ id: s.id, kind: 'start' as const, label: '', x: s.x, y: s.y })),
];

export const NODE_MAP: Record<string, NodeDef> = Object.fromEntries(ALL_NODES.map(n => [n.id, n]));

const adjacency: Record<string, string[]> = {};
for (const [a, b] of EDGES) {
  (adjacency[a] ||= []).push(b);
  (adjacency[b] ||= []).push(a);
}

/** Shortest path length (BFS) between two nodes, or null if unreachable. */
export function distance(a: string, b: string): number | null {
  if (a === b) return 0;
  const queue: string[] = [a];
  const dist: Record<string, number> = { [a]: 0 };
  while (queue.length) {
    const cur = queue.shift()!;
    for (const next of adjacency[cur] || []) {
      if (dist[next] !== undefined) continue;
      dist[next] = dist[cur] + 1;
      if (next === b) return dist[next];
      queue.push(next);
    }
  }
  return null;
}

/** All nodes within `maxSteps` steps of `from`, with their distances. */
export function reachable(from: string, maxSteps: number): Map<string, number> {
  const result = new Map<string, number>();
  const queue: string[] = [from];
  result.set(from, 0);
  while (queue.length) {
    const cur = queue.shift()!;
    const d = result.get(cur)!;
    if (d >= maxSteps) continue;
    for (const next of adjacency[cur] || []) {
      if (result.has(next)) continue;
      result.set(next, d + 1);
      queue.push(next);
    }
  }
  return result;
}

// ---- cards ---------------------------------------------------------------

export interface SuspectDef {
  id: string; // also the suspect card id
  label: string;
  color: string;
}

export const SUSPECTS: SuspectDef[] = [
  { id: 'miss_scarlet', label: 'Miss Scarlet', color: '#e11d48' },
  { id: 'colonel_mustard', label: 'Colonel Mustard', color: '#f59e0b' },
  { id: 'mrs_white', label: 'Mrs. White', color: '#f8fafc' },
  { id: 'mr_green', label: 'Mr. Green', color: '#22c55e' },
  { id: 'mrs_peacock', label: 'Mrs. Peacock', color: '#3b82f6' },
  { id: 'professor_plum', label: 'Professor Plum', color: '#a855f7' },
];

export const SUSPECT_MAP: Record<string, SuspectDef> = Object.fromEntries(SUSPECTS.map(s => [s.id, s]));

export const WEAPONS: string[] = ['candlestick', 'dagger', 'lead_pipe', 'revolver', 'rope', 'wrench'];
export const WEAPON_LABELS: Record<string, string> = {
  candlestick: 'Candlestick',
  dagger: 'Dagger',
  lead_pipe: 'Lead Pipe',
  revolver: 'Revolver',
  rope: 'Rope',
  wrench: 'Wrench',
};

export const ROOM_LABELS: Record<string, string> = Object.fromEntries(ROOMS.map(r => [r.id, r.label]));
export const ROOM_CARDS: string[] = ROOM_IDS;

export const ALL_CARDS: string[] = [...SUSPECTS.map(s => s.id), ...WEAPONS, ...ROOM_CARDS];

export interface CardInfo {
  id: string;
  kind: 'suspect' | 'weapon' | 'room';
  label: string;
  color?: string;
}

export function cardInfo(id: string): CardInfo {
  if (SUSPECT_MAP[id]) return { id, kind: 'suspect', label: SUSPECT_MAP[id].label, color: SUSPECT_MAP[id].color };
  if (WEAPON_LABELS[id]) return { id, kind: 'weapon', label: WEAPON_LABELS[id] };
  if (ROOM_LABELS[id]) return { id, kind: 'room', label: ROOM_LABELS[id] };
  return { id, kind: 'room', label: id };
}

export function cardLabel(id: string): string {
  return cardInfo(id).label;
}
