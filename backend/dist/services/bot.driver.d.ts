import { Server, Socket } from 'socket.io';
export declare const registerGameSocket: (gameKey: string, socket: Socket) => void;
export declare const unregisterGameSocket: (gameKey: string, socket: Socket) => void;
export declare const driveBotTurns: (io: Server, gameId: string) => Promise<void>;
//# sourceMappingURL=bot.driver.d.ts.map