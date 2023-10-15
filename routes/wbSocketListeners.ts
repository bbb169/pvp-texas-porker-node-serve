import { deletePlayerForRoom, getRoomInfo, playerCallChips, startGame, turnToNextGame } from '../database/roomInfo';
import { PlayerInfoStatusType } from '../types/roomInfo';

export function socketDisconnect (roomId: string, userName: string) {
    return new Promise<number>((resolve) => {
    // delete player from waiting room when it disconnects
        const room = getRoomInfo(roomId);

        if (!room) return;
        const disconnectPlayer = room.players.get(userName);
    
        if (disconnectPlayer) {
            if (room.statu === 'waiting') {
                deletePlayerForRoom(roomId, userName);
            } else {
                if (disconnectPlayer?.status.includes('calling')) {
                    playerCallChips(roomId, userName);
                }

                disconnectPlayer.status = disconnectPlayer.status.includes('fold') ? ['fold', 'disconnect'] : ['disconnect'];
            }

            // ========== check room whether is empty ============
            let roomValidPlayerNum = room.players.size;

            room.players.forEach(player => {
                if (player.status.includes('disconnect')) {
                    roomValidPlayerNum--;
                }
            });

            resolve(roomValidPlayerNum);
        }
    });
}

export function socketStartGame (roomId: string, isShortCard: boolean) {
    return new Promise<void>((resolve) => {
        startGame(roomId, isShortCard);
        resolve();
    });
}

export function socketCallChips (roomId: string, userName: string, callChips?: number) {
    return playerCallChips(roomId, userName, callChips);
}

export function socketTurnToNextGame (roomId: string) {
    return new Promise<void>((resolve) => {
        turnToNextGame(roomId);
        resolve();
    });
}