"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventLabel = eventLabel;
const board_1 = require("./board");
function eventLabel(type, data) {
    const d = data;
    switch (type) {
        case 'ROLL': return `🎲 rolled ${String(d.d1)}+${String(d.d2)} = ${String(d.total)}`;
        case 'MOVE': {
            const f = roomOrSquare(String(d.from));
            const t = roomOrSquare(String(d.to));
            return `moved from ${f} to ${t}`;
        }
        case 'PASSAGE': return `crept through a secret passage to ${roomOrSquare(String(d.to))}`;
        case 'SUGGEST': return `suggested ${(0, board_1.cardLabel)(String(d.suspectId))} in the ${(0, board_1.cardLabel)(String(d.roomId))} with the ${(0, board_1.cardLabel)(String(d.weaponId))}`;
        case 'DISPROVE': return `showed a card`;
        case 'NO_DISPROVE': return `no one could disprove the suggestion`;
        case 'ACCUSE': return d.correct ? `made a GREAT ACCUSATION` : `made a false accusation`;
        case 'ELIMINATE': return `has been eliminated`;
        case 'WIN': return `solved the mystery!`;
        case 'END_TURN': return `ended their turn`;
        case 'SYSTEM': return String(d.message || '');
        default: return null;
    }
}
function roomOrSquare(nodeId) {
    if (!nodeId)
        return '?';
    const node = board_1.NODE_MAP[nodeId];
    if (!node)
        return nodeId;
    if (node.kind === 'room')
        return `the ${node.label}`;
    if (node.kind === 'start')
        return 'their start square';
    return 'a hallway square';
}
//# sourceMappingURL=eventLabel.js.map