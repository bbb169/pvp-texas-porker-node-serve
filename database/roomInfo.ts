import { reportToAllPlayersInRoom, RoomSocketMapType } from "../bin/server";
import { PlayerInfoType, RoomInfo } from "../types/roomInfo";
import { isEmpty } from "../utils";
import { distributeCards } from "../utils/cards";

const roomMap = new Map<string, RoomInfo>();
export const bigBlindValue = 5;
export const smallBlindValue = 3;

const initWaitingRommInfo: Omit<Omit<RoomInfo, 'buttonIndex'>, 'players'> = {
  statu: 'waiting',
  currentCallChips: 0,
  currentHasChips: 0,
  callingSteps: 0,
  bigBlind: bigBlindValue,
  smallBlind: smallBlindValue,
  publicCards: []
}

export const createRoom = (createPlayer: PlayerInfoType, roomId: string) => {
  const roomInfo: RoomInfo = {
    buttonIndex: 0,
    players: new Map().set(createPlayer.name, createPlayer),
    ...initWaitingRommInfo,
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
    holdCards: [],
    holdCent: 100,
    calledChips: 0,
    blind: 0,
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

    let hasTurnToNext = false;

    const turnToNextCalling = (playerItem: PlayerInfoType) => {
      room?.players.set(playerItem.name, {
        ...playerItem,
        status:'calling'
      })

      hasTurnToNext = true;
    }

    if (room) {
      const playersQueue = Array.from(room.players.values());

       
      const targetPlayer = playersQueue.find(player => {
        if (player.name === userName) {
          if (!isEmpty(callChips)) {
            // ============== call ==============
            let finalCallChips: number = -1;
            
            // all in
            if (player.holdCent <= callChips) {
              finalCallChips = player.holdCent;
            } else if (room.currentCallChips > callChips + player.calledChips || player.blind > player.calledChips + callChips) {
              reject('called chips is too small')
              return;
            }
  
            // is not all in, just use called chips
            if (finalCallChips === -1) {
              finalCallChips = callChips
            }
  
            player.calledChips += finalCallChips
            player.holdCent -= finalCallChips
            player.status = 'waiting'
      
            room.currentCallChips = player.calledChips
          } else {
            // =============== fold ==============
            player.status = 'fold'
            
            // lose chips
            room.currentHasChips += player.calledChips
            player.calledChips = 0;
          }

          return true;
        }
      })

      if (!targetPlayer) return;

      let currentPosition = (targetPlayer.position + 1)%playersQueue.length;
      while(!hasTurnToNext && currentPosition !== targetPlayer.position) {
        const currentPlayer = playersQueue[currentPosition];
        

        console.log('currentPosition',currentPosition);
        if (currentPlayer.status === 'waiting') {
          turnToNextCalling(currentPlayer);
        } else {
          currentPosition = (currentPosition + 1)%(playersQueue.length - 1);
        }
      }

      // if didn't has turn to next yet, means it's time to determine victory
      if (!hasTurnToNext) {
        determineVictory(roomId)
      }

      if (currentPosition === room.buttonIndex &&checkRoomCallEqual(roomId)) {
        turnToNextRound(roomId)
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
      // all turn to front
      room.publicCards?.forEach(card => card.showFace = 'front')
    }
  }
}

export function turnToNextGame(roomId: string) {
  const room = getRoomInfo(roomId)

  if (room) {
    room.players.forEach(player => {
      player.holdCards = [];
      player.status = 'waiting'
    })

    updateRoom(roomId, {
      ...room,
      buttonIndex: room.buttonIndex + 1,
      ...initWaitingRommInfo,
    })
  }
}

export function startGame(roomId: string, isShortCard = false) {
  const room = getRoomInfo(roomId)

  if (room) {
    const newRoom = distributeCards(room, isShortCard)
    updateRoom(roomId, newRoom)
  }

  return room
}

function checkRoomCallEqual(roomId: string) {
  const room = getRoomInfo(roomId)

  if (room) {
    let calledChips = -1;

    room.players.forEach(player => {
      if (calledChips === -2) {
        return
      }

      if (calledChips === -1 && player.status !== 'fold') {
        calledChips = player.calledChips
      }
      // find inequal calledChips and stop to check
      if (player.status !== 'fold' && calledChips > -1 && calledChips !== player.calledChips) {
        console.log(calledChips);
        
        calledChips = -2
        return;
      }
    })

    return calledChips !== -2
  }

  return false;
}

function turnToNextRound(roomId: string) {
  const room = getRoomInfo(roomId)
  if (!room) return

  let buttonPlayer: PlayerInfoType | undefined = undefined;

  while (!buttonPlayer) {
    const curPlayer = room.players.values().next().value as PlayerInfoType
    
    console.log(curPlayer);
    if (curPlayer.position === room.buttonIndex) {
      buttonPlayer = curPlayer
    }
  }

  if (!buttonPlayer) return

  buttonPlayer.status = 'calling';
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

export const getRoomSBOrBBPosition = (room: RoomInfo, type: 'SB' | 'BB'): number => {
  let result = -1;

  if (room) {
    const tempPosition = room.buttonIndex - (type === 'BB' ? 2 : 1)

    if (tempPosition < 0) {
      // last one
      result = room.players.size + tempPosition;
    } else {
      result = tempPosition;
    }
  }

  return result
}