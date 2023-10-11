import { deletePlayerForRoom, getRoomInfo, playerCallChips, startGame, turnToNextGame } from '../database/roomInfo';

export function socketDisconnect (roomId: string, userName: string) {
    return new Promise<number>((resolve) => {
    // delete player from waiting room when it disconnects
        const room = getRoomInfo(roomId);

        if (!room) return;
        const disconnectPlayer = room.players.get(userName);
        console.log('disconnectPlayer', disconnectPlayer?.status);
    
        if (disconnectPlayer) {
            if (room.statu === 'waiting') {
                deletePlayerForRoom(roomId, userName);
            } else {
                if (disconnectPlayer?.status === 'calling') {
                    console.log('playerCallChips()', roomId, userName);
          
                    playerCallChips(roomId, userName);
                }

                room.players.set(userName, {
                    ...disconnectPlayer,
                    status: 'disconnect',
                });
            }

            // ========== check room whether is empty ============
            let roomValidPlayerNum = room.players.size;

            room.players.forEach(player => {
                if (player.status === 'disconnect') {
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