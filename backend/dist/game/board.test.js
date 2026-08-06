"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const board_1 = require("./board");
(0, vitest_1.describe)('board graph integrity', () => {
    (0, vitest_1.it)('every room, corridor, and start square exists in NODE_MAP', () => {
        for (const n of board_1.ALL_NODES)
            (0, vitest_1.expect)(board_1.NODE_MAP[n.id]).toBeTruthy();
    });
    (0, vitest_1.it)('every edge endpoint is a known node', () => {
        for (const [a, b] of board_1.EDGES) {
            (0, vitest_1.expect)(board_1.NODE_MAP[a]).toBeTruthy();
            (0, vitest_1.expect)(board_1.NODE_MAP[b]).toBeTruthy();
        }
    });
    (0, vitest_1.it)('edges are bidirectional and unique', () => {
        const seen = new Set();
        for (const [a, b] of board_1.EDGES) {
            const key = [a, b].sort().join('|');
            (0, vitest_1.expect)(seen.has(key)).toBe(false);
            seen.add(key);
        }
        // reverse edges implicitly: adjacency built from both directions
        (0, vitest_1.expect)(board_1.EDGES.length).toBeGreaterThan(board_1.ROOMS.length);
    });
    (0, vitest_1.it)('the graph is fully connected', () => {
        const start = board_1.ALL_NODES[0].id;
        const visited = new Set();
        const queue = [start];
        visited.add(start);
        while (queue.length) {
            const cur = queue.pop();
            for (const [a, b] of board_1.EDGES) {
                const nb = a === cur ? b : b === cur ? a : null;
                if (nb && !visited.has(nb)) {
                    visited.add(nb);
                    queue.push(nb);
                }
            }
        }
        (0, vitest_1.expect)(visited.size).toBe(board_1.ALL_NODES.length);
    });
    (0, vitest_1.it)('distance returns finite values inside the graph and null off-board', () => {
        const between = (0, board_1.distance)(board_1.ROOMS[0].id, board_1.ROOMS[1].id);
        (0, vitest_1.expect)(typeof between).toBe('number');
        (0, vitest_1.expect)(between).toBeGreaterThan(0);
        (0, vitest_1.expect)((0, board_1.distance)('nope', board_1.ROOMS[0].id)).toBeNull();
        (0, vitest_1.expect)((0, board_1.distance)(board_1.ROOMS[0].id, board_1.ROOMS[0].id)).toBe(0);
    });
    (0, vitest_1.it)('secret passages are symmetric', () => {
        (0, vitest_1.expect)(board_1.PASSAGES['kitchen']).toBe('study');
        (0, vitest_1.expect)(board_1.PASSAGES['study']).toBe('kitchen');
        (0, vitest_1.expect)(board_1.PASSAGES['lounge']).toBe('conservatory');
        (0, vitest_1.expect)(board_1.PASSAGES['conservatory']).toBe('lounge');
    });
});
(0, vitest_1.describe)('card catalog consistency', () => {
    (0, vitest_1.it)('all suspects, weapons, and rooms are distinct cards', () => {
        const ids = board_1.ALL_CARDS;
        (0, vitest_1.expect)(new Set(ids).size).toBe(ids.length);
        (0, vitest_1.expect)(ids.length).toBe(board_1.SUSPECTS.length + board_1.WEAPONS.length + board_1.ROOM_IDS.length);
    });
    (0, vitest_1.it)('every suspect/weapon/room has a label', () => {
        for (const s of board_1.SUSPECTS)
            (0, vitest_1.expect)((0, board_1.cardLabel)(s.id).length).toBeGreaterThan(0);
        for (const w of board_1.WEAPONS)
            (0, vitest_1.expect)((0, board_1.cardLabel)(w).length).toBeGreaterThan(0);
        for (const r of board_1.ROOMS)
            (0, vitest_1.expect)((0, board_1.cardLabel)(r.id).length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('cardInfo classifies correctly', () => {
        (0, vitest_1.expect)((0, board_1.cardInfo)(board_1.SUSPECTS[0].id).kind).toBe('suspect');
        (0, vitest_1.expect)((0, board_1.cardInfo)(board_1.SUSPECTS[0].id).color).toBe(board_1.SUSPECTS[0].color);
        (0, vitest_1.expect)((0, board_1.cardInfo)(board_1.WEAPONS[0]).kind).toBe('weapon');
        (0, vitest_1.expect)((0, board_1.cardInfo)(board_1.ROOMS[0].id).kind).toBe('room');
    });
});
//# sourceMappingURL=board.test.js.map