import { cardLabel, NODE_MAP } from './board';

export function eventLabel(type: string, data: Record<string, unknown>): string | null {
  const d = data;
  switch (type) {
    case 'ROLL': return `🎲 rolled ${String(d.d1)}+${String(d.d2)} = ${String(d.total)}`;
    case 'MOVE': {
      const f = roomOrSquare(String(d.from));
      const t = roomOrSquare(String(d.to));
      return `moved from ${f} to ${t}`;
    }
    case 'PASSAGE': return `crept through a secret passage to ${roomOrSquare(String(d.to))}`;
    case 'SUGGEST': return `suggested ${cardLabel(String(d.suspectId))} in the ${cardLabel(String(d.roomId))} with the ${cardLabel(String(d.weaponId))}`;
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

function roomOrSquare(nodeId: string): string {
  if (!nodeId) return '?';
  const node = NODE_MAP[nodeId];
  if (!node) return nodeId;
  if (node.kind === 'room') return `the ${node.label}`;
  if (node.kind === 'start') return 'their start square';
  return 'a hallway square';
}