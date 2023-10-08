import { reportToAllPlayersInRoom, RoomSocketMapType } from "../bin/server";
import { PlayerInfoType, RoomInfo } from "../types/roomInfo";
import { distributeCards, initAllCards } from "../utils/cards";

const roomMap = new Map<string, RoomInfo>();

export const createRoom = (createPlayer: PlayerInfoType, roomId: string, shortCards = false) => {
  const allCards = initAllCards(shortCards);
  const roomInfo: RoomInfo = {
    buttonIndex: 0,
    players: new Map().set(createPlayer.name, createPlayer),
    cards: allCards,
    statu: 'waiting',
    currentCallChips: 0,
    currentHasChips: 0,
    callingSteps: 0,
  }

  roomMap.set(roomId, roomInfo)

  return roomInfo;
}

export const creatPlayer = (userName: string, roomId?: string): PlayerInfoType => {
  let position = 0

  if (roomId) {
    const room = getRoomInfo(roomId)
    if (room) {
      position = room.players.size
      if (room.players.has(userName)) {
        userName = userName + '-1'
      }
    }
  }

  return {
    name: userName,
    position,
    status: 'waiting',
    holdCent: 100,
    calledChips: 0,
  }
}

export const addPlayerForRoom = (roomId: string, addPlayer: PlayerInfoType) => {
  const room = roomMap.get(roomId)
  if (room && !room.players.has(addPlayer.name)) {
    room.players.set(addPlayer.name, addPlayer);
  }
}

export const deletePlayerForRoom = (roomId: string, userName: string, roomSocketMap: RoomSocketMapType) => {
  const room = roomMap.get(roomId)

  if (room && room.players.has(userName)) {
    let playerIndex = -1;

    room.players.forEach((player, userName) => {
      if (playerIndex !== -1) {
        player.position -= 1
      }
      if (player.name === userName) {
        playerIndex = player.position
      }
    });
    if (playerIndex === -1) return;

    room.players.delete(userName)
    
    // handle sockets
    roomSocketMap.get(roomId)?.delete(userName);
    reportToAllPlayersInRoom(roomId);
  }
}

// ====================== game proccesses  ====================

export function playerCallChips(roomId: string, userName: string, callChips?: number) {
  return new Promise<string>((resolve, reject) => {
    const room = getRoomInfo(roomId)

    let player: PlayerInfoType;
    let firstPlayer: PlayerInfoType | undefined = undefined;
    let hasTurnToNext = false;

    if (room) {
      // need to travel the players to find next player
      room.players.forEach(playerItem => {
        // =========== turn to next player ==============
        if (player && !hasTurnToNext && !checkRoomCallEqual(roomId) && playerItem.status !== 'fold') {
          playerItem.status = 'calling'
          hasTurnToNext = true
        }

        if (!firstPlayer) {
          firstPlayer = playerItem
        }
        // ============ change current player ==============
        if (playerItem.name === userName) {
          player = playerItem
          if (callChips !== undefined) {
            // ============== call ==============
            if (player.holdCent < callChips) {
              reject('called chips is too large')
            }
            if (room.currentCallChips > callChips + playerItem.calledChips) {
              reject('called chips is too small')
            }
            player.calledChips += callChips
            player.holdCent -= callChips
            player.status = 'waiting'
      
            room.currentCallChips = player.calledChips
          } else {
            // =============== fold ==============
            player.status = 'fold'

            // lose chips
            room.currentHasChips += player.calledChips
          }
        }
      })

      if ((firstPlayer as unknown as PlayerInfoType).status !== 'fold' && !hasTurnToNext && !checkRoomCallEqual(roomId)) {
        (firstPlayer as unknown as PlayerInfoType).status = 'calling'
        hasTurnToNext = true
      }

      if (!hasTurnToNext) {
        console.log('determineVictory');
        
        determineVictory(roomId)
      }
    }

    resolve('success')
  })
}

function determineVictory(roomId: string) {
  const room = getRoomInfo(roomId)

  if (room) {
    let validPlayerNum = room.players.size;
    let validPlayer: PlayerInfoType | undefined = undefined;

    room.players.forEach(player => {
      if (player.status === 'fold') {
        validPlayerNum--
      } else {
        validPlayer = player
      }
    })

    if (validPlayerNum === 1) {
      const typedPlayer = validPlayer as unknown as PlayerInfoType;

      typedPlayer.holdCent += typedPlayer.calledChips;
      typedPlayer.calledChips = 0;
      typedPlayer.holdCent += room.currentHasChips;
      room.statu = 'settling';
    }
  }
}

export function startGame(roomId: string) {
  const room = getRoomInfo(roomId)

  if (room) {
    if (room.buttonIndex !== 0) {
      room.buttonIndex += 1
    }

    const newRoom = distributeCards(room)
    updateRoom(roomId, newRoom)
  }

  return room
}

function checkRoomCallEqual(roomId: string) {
  const room = getRoomInfo(roomId)

  if (room) {
    let calledChips = -1;
    let buttonPlayer = undefined;

    room.players.forEach(player => {
      if (player.position === room.buttonIndex) {
        buttonPlayer = player
      }

      if (calledChips === -2) {
        return
      }

      if (calledChips === -1) {
        calledChips = player.calledChips
      }
      // find inequal calledChips and stop to check
      if (player.status !== 'fold' && calledChips !== player.calledChips) {
        calledChips = -2
        return;
      }
    })

    // ======== when calling to equal chips =============
    if (calledChips !== -2 && buttonPlayer) {
      (buttonPlayer as PlayerInfoType).status = 'calling';
      // first calling to equal will filp three cards
      if (room.callingSteps === 0) {
        if (room.publicCards) {
          room.publicCards.forEach((card,index) => {
            if (index <= 2) {
              card.showFace = 'front'
            }
          })
          room.callingSteps += 1
        }
      } else if (room.callingSteps === 3) {
        // determine victory
      } else {
        // filp next one card in other situation
        const nextCard = room.publicCards?.find(card => card.showFace === 'back')
        if (nextCard) {
          nextCard.showFace = 'front'
        }
        
        room.callingSteps += 1
      }
    }

    return calledChips !== -2
  }

  return false;
}

// ====================== game proccesses  ====================

export const getRoomInfo = (roomId: string) => {
  return roomMap.get(roomId)
}

export const deleteRoom = (roomId: string) => {
  return roomMap.delete(roomId)
}

export const updateRoom = (roomId: string,room: RoomInfo) => {
  return roomMap.set(roomId, room)
}