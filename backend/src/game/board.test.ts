import { describe, it, expect } from 'vitest';
import {
  ROOMS, EDGES, NODE_MAP, ALL_NODES,
  SUSPECTS, WEAPONS, ALL_CARDS, ROOM_IDS, PASSAGES, distance, cardLabel, cardInfo,
} from './board';

describe('board graph integrity', () => {
  it('every room, corridor, and start square exists in NODE_MAP', () => {
    for (const n of ALL_NODES) expect(NODE_MAP[n.id]).toBeTruthy();
  });

  it('every edge endpoint is a known node', () => {
    for (const [a, b] of EDGES) {
      expect(NODE_MAP[a]).toBeTruthy();
      expect(NODE_MAP[b]).toBeTruthy();
    }
  });

  it('edges are bidirectional and unique', () => {
    const seen = new Set<string>();
    for (const [a, b] of EDGES) {
      const key = [a, b].sort().join('|');
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
    // reverse edges implicitly: adjacency built from both directions
    expect(EDGES.length).toBeGreaterThan(ROOMS.length);
  });

  it('the graph is fully connected', () => {
    const start = ALL_NODES[0].id;
    const visited = new Set<string>();
    const queue = [start];
    visited.add(start);
    while (queue.length) {
      const cur = queue.pop()!;
      for (const [a, b] of EDGES) {
        const nb = a === cur ? b : b === cur ? a : null;
        if (nb && !visited.has(nb)) {
          visited.add(nb);
          queue.push(nb);
        }
      }
    }
    expect(visited.size).toBe(ALL_NODES.length);
  });

  it('distance returns finite values inside the graph and null off-board', () => {
    const between = distance(ROOMS[0].id, ROOMS[1].id);
    expect(typeof between).toBe('number');
    expect(between!).toBeGreaterThan(0);
    expect(distance('nope', ROOMS[0].id)).toBeNull();
    expect(distance(ROOMS[0].id, ROOMS[0].id)).toBe(0);
  });

  it('secret passages are symmetric', () => {
    expect(PASSAGES['kitchen']).toBe('study');
    expect(PASSAGES['study']).toBe('kitchen');
    expect(PASSAGES['lounge']).toBe('conservatory');
    expect(PASSAGES['conservatory']).toBe('lounge');
  });
});

describe('card catalog consistency', () => {
  it('all suspects, weapons, and rooms are distinct cards', () => {
    const ids = ALL_CARDS;
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(SUSPECTS.length + WEAPONS.length + ROOM_IDS.length);
  });

  it('every suspect/weapon/room has a label', () => {
    for (const s of SUSPECTS) expect(cardLabel(s.id).length).toBeGreaterThan(0);
    for (const w of WEAPONS) expect(cardLabel(w).length).toBeGreaterThan(0);
    for (const r of ROOMS) expect(cardLabel(r.id).length).toBeGreaterThan(0);
  });

  it('cardInfo classifies correctly', () => {
    expect(cardInfo(SUSPECTS[0].id).kind).toBe('suspect');
    expect(cardInfo(SUSPECTS[0].id).color).toBe(SUSPECTS[0].color);
    expect(cardInfo(WEAPONS[0]).kind).toBe('weapon');
    expect(cardInfo(ROOMS[0].id).kind).toBe('room');
  });
});