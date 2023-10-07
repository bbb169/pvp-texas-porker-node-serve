import { PlayerInfoType, RoomInfo } from "../types/roomInfo";
import { initAllCards } from "../utils/cards";

const roomMap = new Map<string, RoomInfo>();

export const createRoom = (createPlayer: PlayerInfoType, roomId: string, shortCards = false) => {
  const allCards = initAllCards(shortCards);
  const roomInfo: RoomInfo = {
    buttonIndex: 0,
    players: [createPlayer],
    cards: allCards,
    playerMap: new Set(),
    statu: 'waiting'
  }

  roomMap.set(roomId, roomInfo)

  return roomInfo;
}

export const creatPlayer = (userName: string, roomId?: string): PlayerInfoType => {
  let position = 0

  if (roomId) {
    const room = getRoomInfo(roomId)
    if (room) {
      position = room.players.length
      if (room.playerMap.has(userName)) {
        userName = userName + '-1'
      }
    }
  }

  return {
    name: userName,
    position,
    status: 'waiting',
    holdCent: 100,
  }
}

export const addPlayerForRoom = (roomId: string, addPlayer: PlayerInfoType) => {
  const room = roomMap.get(roomId)
  if (room && !room.playerMap.has(addPlayer.name)) {
    room.players.push(addPlayer);
    room.playerMap.add(addPlayer.name);
  }
}

export const deletePlayerForRoom = (roomId: string, userName: string) => {
  const room = roomMap.get(roomId)

  if (room && !room.playerMap.has(userName)) {
    const playerIndex =  room.players.findIndex(player => player.name === userName);
    room.players.splice(playerIndex, 1)
    room.playerMap.delete(userName);
  }
}

['123456', '888888'].forEach(item => {
  createRoom({
    name: `player-3`,
    position: 3,
    status: 'waiting',
    holdCent: 100,
  }, '3');

  [2,1,8,7,6,5,4].map((index) => {
    return addPlayerForRoom(item, {
      name: `player-${index}`,
      position: index,
      status: 'waiting',
      holdCent: 100,
    })
  })
});

export const getRoomInfo = (roomId: string) => {
  return roomMap.get(roomId)
}

export const deleteRoom = (roomId: string) => {
  return roomMap.delete(roomId)
}
