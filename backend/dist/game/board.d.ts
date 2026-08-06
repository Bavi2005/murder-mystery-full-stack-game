export interface RoomDef {
    id: string;
    label: string;
    x: number;
    y: number;
}
export interface CorridorDef {
    id: string;
    x: number;
    y: number;
}
export declare const GRID_CELL = 90;
export declare const ROOMS: RoomDef[];
export declare const ROOM_IDS: string[];
export declare const CORRIDORS: CorridorDef[];
export declare const START_SQUARES: CorridorDef[];
export declare const PASSAGES: Record<string, string>;
export declare const EDGES: [string, string, boolean?][];
export interface NodeDef {
    id: string;
    kind: 'room' | 'corridor' | 'start';
    label: string;
    x: number;
    y: number;
}
export declare const ALL_NODES: NodeDef[];
export declare const NODE_MAP: Record<string, NodeDef>;
/** Shortest path length (BFS) between two nodes, or null if unreachable. */
export declare function distance(a: string, b: string): number | null;
/** All nodes within `maxSteps` steps of `from`, with their distances. */
export declare function reachable(from: string, maxSteps: number): Map<string, number>;
export interface SuspectDef {
    id: string;
    label: string;
    color: string;
}
export declare const SUSPECTS: SuspectDef[];
export declare const SUSPECT_MAP: Record<string, SuspectDef>;
export declare const WEAPONS: string[];
export declare const WEAPON_LABELS: Record<string, string>;
export declare const ROOM_LABELS: Record<string, string>;
export declare const ROOM_CARDS: string[];
export declare const ALL_CARDS: string[];
export interface CardInfo {
    id: string;
    kind: 'suspect' | 'weapon' | 'room';
    label: string;
    color?: string;
}
export declare function cardInfo(id: string): CardInfo;
export declare function cardLabel(id: string): string;
//# sourceMappingURL=board.d.ts.map