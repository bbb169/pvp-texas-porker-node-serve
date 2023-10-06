import { PlayerInfoType, RoomInfo } from "../types/roomInfo";
import { initAllCards } from "../utils/cards";

const roomMap = new Map<string, RoomInfo>()

export function createRoom(createPlayer: PlayerInfoType, roomId: string, shortCards = false) {
  const allCards = initAllCards(shortCards);
  const roomInfo: RoomInfo = {
    buttonIndex: 0,
    players: [createPlayer],
    cards: allCards
  }

  roomMap.set(roomId, roomInfo)

  return roomInfo;
}

export function addPlayerForRoom(roomId: string, addPlayer: PlayerInfoType) {
  roomMap.get(roomId)?.players.push(addPlayer);
}

export function getRoomInfo(roomId: string) {
  return roomMap.get(roomId)
}

export function deleteRoom(roomId: string) {
  return roomMap.delete(roomId)
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
})
