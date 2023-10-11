import { deleteRoomSocket, reportToAllPlayersInRoom } from "../bin/server";
import { deletePlayerForRoom, deleteRoom, getRoomInfo, playerCallChips, startGame, turnToNextGame } from "../database/roomInfo";
import { RoomInfo } from "../types/roomInfo";

export function socketDisconnect(roomId: string,userName: string) {
  // delete player from waiting room when it disconnects
  const room = getRoomInfo(roomId);

  if (!room) return;

  deleteRoomSocket(roomId, userName);
  const disconnectPlayer = room.players.get(userName)
  console.log('disconnectPlayer',disconnectPlayer?.status);
  
  if (disconnectPlayer) {
    if (room.statu === 'waiting') {
      deletePlayerForRoom(roomId, userName);
    } else {
      if (disconnectPlayer?.status === 'calling') {
        console.log('playerCallChips()',roomId, userName);
        
        playerCallChips(roomId, userName)
      }

      room.players.set(userName, {
        ...disconnectPlayer,
        status: 'disconnect'
      })
    }

    // ========== check room whether is empty ============
    let roomValidPlayerNum = room.players.size;

    room.players.forEach(player => {
      if (player.status === 'disconnect') {
        roomValidPlayerNum--
      }
    })

    if (!roomValidPlayerNum) {
      deleteRoom(roomId);
      deleteRoomSocket(roomId);
    } else {
      console.log('reportToAllPlayersInRoom', disconnectPlayer.name, disconnectPlayer.status);
      
      reportToAllPlayersInRoom(roomId)
    }
  }
}

export function socketStartGame(roomId: string,isShortCard: boolean) {
  startGame(roomId, isShortCard)
      
  reportToAllPlayersInRoom(roomId)
}

export function socketCallChips(roomId: string, userName: string, callChips?: number) {
  playerCallChips(roomId, userName, callChips).then(() => {
    reportToAllPlayersInRoom(roomId)
  })
}

export function socketTurnToNextGame(roomId: string) {
  turnToNextGame(roomId)
  reportToAllPlayersInRoom(roomId)
}