import { describe, it, expect } from 'vitest';
import {
  ROOMS, CORRIDORS, START_SQUARES, NODE_MAP, EDGES,
  distance, cardLabel, cardCategory, PASSAGES, ALL_CARDS, ROOM_IDS,
} from './board';

describe('board layout', () => {
  it('has 9 rooms, corridors, and start squares', () => {
    expect(ROOMS).toHaveLength(9);
    expect(CORRIDORS.length).toBeGreaterThan(0);
    expect(START_SQUARES).toHaveLength(6);
  });

  it('has unique node ids', () => {
    const ids = Object.keys(NODE_MAP);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has the classic 9 Cluedo room ids', () => {
    expect(ROOM_IDS).toEqual([
      'kitchen', 'ballroom', 'conservatory', 'dining_room', 'billiard_room',
      'library', 'lounge', 'hall', 'study',
    ]);
  });

  it('has 26 edges and 2 secret passages', () => {
    expect(EDGES).toHaveLength(26);
    expect(EDGES.filter(([, , secret]) => secret)).toHaveLength(2);
  });
});

describe('distance', () => {
  it('returns 0 for identical nodes', () => {
    expect(distance('kitchen', 'kitchen')).toBe(0);
  });

  it('adjacent nodes are 1 step apart', () => {
    expect(distance('kitchen', 'k_b')).toBe(1);
    expect(distance('kitchen', 'k_d')).toBe(1);
  });

  it('finds a path across the board', () => {
    const d = distance('kitchen', 'study');
    expect(d).not.toBeNull();
    expect(d!).toBeGreaterThan(0);
  });

  it('returns null for unreachable nodes', () => {
    expect(distance('kitchen', 'does_not_exist')).toBeNull();
  });
});

describe('cardLabel', () => {
  it('labels suspects, weapons, and rooms', () => {
    expect(cardLabel('miss_scarlet')).toBe('Miss Scarlet');
    expect(cardLabel('revolver')).toBe('Revolver');
    expect(cardLabel('kitchen')).toBe('Kitchen');
  });

  it('falls back to the raw id', () => {
    expect(cardLabel('bogus_card')).toBe('bogus_card');
  });
});

describe('cardCategory', () => {
  it('classifies suspect, weapon, and room cards', () => {
    expect(cardCategory('professor_plum')).toBe('suspect');
    expect(cardCategory('rope')).toBe('weapon');
    expect(cardCategory('study')).toBe('room');
  });

  it('treats unknown ids as rooms', () => {
    expect(cardCategory('bogus')).toBe('room');
  });
});

describe('ALL_CARDS', () => {
  it('contains 6 suspects, 6 weapons, and 9 rooms', () => {
    expect(ALL_CARDS.filter(c => cardCategory(c) === 'suspect')).toHaveLength(6);
    expect(ALL_CARDS.filter(c => cardCategory(c) === 'weapon')).toHaveLength(6);
    expect(ALL_CARDS.filter(c => cardCategory(c) === 'room')).toHaveLength(9);
    expect(new Set(ALL_CARDS).size).toBe(ALL_CARDS.length);
  });
});

describe('PASSAGES', () => {
  it('links kitchen↔study and lounge↔conservatory symmetrically', () => {
    expect(PASSAGES.kitchen).toBe('study');
    expect(PASSAGES.study).toBe('kitchen');
    expect(PASSAGES.lounge).toBe('conservatory');
    expect(PASSAGES.conservatory).toBe('lounge');
  });
});
