// Mirrors backend/src/game/board.ts — keep in sync. Used for rendering only;
// the server is always the source of truth for rules & positions.

export interface RoomDef {
  id: string;
  label: string;
  x: number;
  y: number;
}

export const GRID_CELL = 90;

export const ROOMS: RoomDef[] = [
  { id: 'kitchen', label: 'Kitchen', x: 0, y: 0 },
  { id: 'ballroom', label: 'Ballroom', x: 3, y: 0 },
  { id: 'conservatory', label: 'Conservatory', x: 6, y: 0 },
  { id: 'dining_room', label: 'Dining Room', x: 0, y: 3 },
  { id: 'billiard_room', label: 'Billiard Room', x: 3, y: 3 },
  { id: 'library', label: 'Library', x: 6, y: 3 },
  { id: 'lounge', label: 'Lounge', x: 0, y: 6 },
  { id: 'hall', label: 'Hall', x: 3, y: 6 },
  { id: 'study', label: 'Study', x: 6, y: 6 },
];

export const ROOM_IDS = ROOMS.map(r => r.id);

export interface CorridorDef {
  id: string;
  x: number;
  y: number;
}

export const CORRIDORS: CorridorDef[] = [
  { id: 'k_b', x: 1.5, y: 0 },
  { id: 'b_c', x: 4.5, y: 0 },
  { id: 'k_d', x: 0, y: 1.5 },
  { id: 'd_b', x: 1.5, y: 3 },
  { id: 'c_b', x: 4.5, y: 1.5 },
  { id: 'c_l', x: 4.5, y: 1.5 },
  { id: 'b_l', x: 4.5, y: 3 },
  { id: 'd_lg', x: 0, y: 4.5 },
  { id: 'lg_h', x: 1.5, y: 6 },
  { id: 'h_s', x: 4.5, y: 6 },
  { id: 'b_s', x: 6, y: 4.5 },
  { id: 'l_s', x: 4.5, y: 4.5 },
];

export const START_SQUARES: CorridorDef[] = [
  { id: 'start0', x: 1.5, y: 1.5 },
  { id: 'start1', x: 4.5, y: 1.5 },
  { id: 'start2', x: 0, y: 2.5 },
  { id: 'start3', x: 6, y: 2.5 },
  { id: 'start4', x: 1.5, y: 4.5 },
  { id: 'start5', x: 4.5, y: 4.5 },
];

export const EDGES: [string, string, boolean?][] = [
  ['kitchen', 'k_b'],
  ['k_b', 'ballroom'],
  ['ballroom', 'b_c'],
  ['b_c', 'conservatory'],
  ['kitchen', 'k_d'],
  ['k_d', 'dining_room'],
  ['dining_room', 'd_b'],
  ['d_b', 'billiard_room'],
  ['conservatory', 'c_b'],
  ['c_b', 'billiard_room'],
  ['conservatory', 'c_l'],
  ['c_l', 'library'],
  ['billiard_room', 'b_l'],
  ['b_l', 'library'],
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
  ['kitchen', 'study', true],
  ['lounge', 'conservatory', true],
];

export interface NodeDef {
  id: string;
  kind: 'room' | 'corridor' | 'start';
  x: number;
  y: number;
  label?: string;
}

export const ALL_NODES: NodeDef[] = [
  ...ROOMS.map(r => ({ id: r.id, kind: 'room' as const, x: r.x, y: r.y, label: r.label })),
  ...CORRIDORS.map(c => ({ id: c.id, kind: 'corridor' as const, x: c.x, y: c.y })),
  ...START_SQUARES.map(s => ({ id: s.id, kind: 'start' as const, x: s.x, y: s.y })),
];

export const NODE_MAP: Record<string, NodeDef> = Object.fromEntries(ALL_NODES.map(n => [n.id, n]));

const adj: Record<string, string[]> = {};
for (const [a, b, secret] of EDGES) {
  if (secret) continue;
  (adj[a] ||= []).push(b);
  (adj[b] ||= []).push(a);
}

export function distance(a: string, b: string): number | null {
  if (a === b) return 0;
  const seen = new Set<string>([a]);
  let frontier = [a];
  let steps = 0;
  while (frontier.length) {
    const next: string[] = [];
    steps++;
    for (const node of frontier) {
      for (const n of adj[node] || []) {
        if (n === b) return steps;
        if (!seen.has(n)) {
          seen.add(n);
          next.push(n);
        }
      }
    }
    frontier = next;
  }
  return null;
}

export const SUSPECTS = [
  { id: 'miss_scarlet', label: 'Miss Scarlet', color: '#dc2626' },
  { id: 'colonel_mustard', label: 'Colonel Mustard', color: '#ca8a04' },
  { id: 'mrs_white', label: 'Mrs. White', color: '#e5e7eb' },
  { id: 'mr_green', label: 'Mr. Green', color: '#16a34a' },
  { id: 'mrs_peacock', label: 'Mrs. Peacock', color: '#2563eb' },
  { id: 'professor_plum', label: 'Professor Plum', color: '#7c3aed' },
];

export const SUSPECT_MAP: Record<string, { id: string; label: string; color: string }> =
  Object.fromEntries(SUSPECTS.map(s => [s.id, s]));

export const WEAPONS = ['candlestick', 'dagger', 'lead_pipe', 'revolver', 'rope', 'wrench'];

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

export function cardLabel(id: string): string {
  if (SUSPECT_MAP[id]) return SUSPECT_MAP[id].label;
  if (WEAPON_LABELS[id]) return WEAPON_LABELS[id];
  if (ROOM_LABELS[id]) return ROOM_LABELS[id];
  return id;
}

export function cardCategory(id: string): 'suspect' | 'weapon' | 'room' {
  if (SUSPECT_MAP[id]) return 'suspect';
  if (WEAPON_LABELS[id]) return 'weapon';
  return 'room';
}

export const PASSAGES: Record<string, string> = {
  kitchen: 'study',
  study: 'kitchen',
  lounge: 'conservatory',
  conservatory: 'lounge',
};
