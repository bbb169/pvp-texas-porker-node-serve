import { Injectable } from '@nestjs/common';
import { PlayerInfoType, RoomInfo, VictoryInfo, PlayerCallChipsRes } from '../../../types/roomInfo';
import { isEmpty } from '../../../utils';
import { distributeCards, translateCardToString, translateStringToCard } from '../../../utils/cards';
import Hand from '../../../utils/pokersolver';
import { HandClassType } from '../../../types/pokersolver';

@Injectable()
export class RoomService {
  private readonly roomMap = new Map<string, RoomInfo>();
  private readonly bigBlindValue = 5;
  private readonly smallBlindValue = 3;

  private readonly initWaitingRommInfo: Omit<Omit<RoomInfo, 'buttonIndex'>, 'players'> = {
    statu: 'waiting',
    currentCallChips: 0,
    currentHasChips: 0,
    callingSteps: 0,
    bigBlind: this.bigBlindValue,
    smallBlind: this.smallBlindValue,
    publicCards: [],
    isShortCards: false,
  };

  createRoom(createPlayer: PlayerInfoType, roomId: string): RoomInfo {
    const roomInfo: RoomInfo = {
      buttonIndex: 0,
      players: new Map().set(createPlayer.name, createPlayer),
      ...this.initWaitingRommInfo,
    };

    this.roomMap.set(roomId, roomInfo);
    return roomInfo;
  }

  createPlayer(userName: string, roomId?: string): PlayerInfoType {
    let position = 0;

    if (roomId) {
      const room = this.getRoomInfo(roomId);
      if (room) {
        position = room.players.size;
        if (room.players.has(userName)) {
          userName = `${userName}-1`;
        }
      }
    }

    return {
      name: userName,
      position,
      status: ['waiting'],
      holdCards: [],
      holdCent: 100,
      calledChips: 0,
      blind: 0,
      debt: 0,
      roundCalled: false,
      activeTime: new Date().getSeconds(),
    };
  }

  addPlayerForRoom(roomId: string, addPlayer: PlayerInfoType): void {
    const room = this.roomMap.get(roomId);
    if (room && !room.players.has(addPlayer.name)) {
      room.players.set(addPlayer.name, addPlayer);
    }
  }

  deletePlayerForRoom(roomId: string, userName: string): void {
    const room = this.roomMap.get(roomId);

    if (room && room.players.has(userName)) {
      let playerIndex = -1;
      let isButtonPlayer = false;

      room.players.forEach((player) => {
        if (playerIndex !== -1) {
          player.position -= 1;
        }
        if (player.name === userName) {
          playerIndex = player.position;
          isButtonPlayer = player.position === room.buttonIndex;
        }
      });
      
      if (playerIndex === -1) return;

      room.players.delete(userName);
      
      if (isButtonPlayer) {
        this.updateRoom(roomId, {
          ...room,
          buttonIndex: (room.buttonIndex + 1) % room.players.size,
        });
      }
    }
  }

  updatePlayerActiveTime(roomId: string, userName: string): void {
    const player = this.roomMap.get(roomId)?.players.get(userName);

    if (player) {
      player.activeTime = new Date().getSeconds();
    }
  }

  // Game processes
  async playerCallChips(roomId: string, userName: string, callChips?: number): Promise<PlayerCallChipsRes> {
    const room = this.getRoomInfo(roomId);
    const playersCalledRes: [PlayerInfoType, string][] = [];
    
    if (room) {
      const playersQueue = Array.from(room.players.values());

      // Handle called chips
      const targetPlayer = playersQueue.find(player => {
        if (player.name === userName) {
          playersCalledRes.push(this.hanldePlayerCalledChips(roomId, player, callChips));
          return true;
        }
        return false;
      });

      if (!targetPlayer) {
        console.log('error', 'playerCallChips can\'t find targetPlayer', playersQueue, roomId, userName, callChips);
        return { playersCalledRes };
      }

      if (this.checkRoomValidPlayerNumIsOne(roomId)) {
        return {
          victoryPlayers: this.determineVictory(roomId),
          playersCalledRes,
        };
      }

      // Turn to next player calling
      let hasTurnToNext = false;
      let currentPosition = (targetPlayer.position + 1) % playersQueue.length;

      while(!hasTurnToNext && currentPosition !== targetPlayer.position) {
        const currentPlayer = playersQueue[currentPosition];

        if (currentPlayer.status.includes('waiting')) { // turn to next
          currentPlayer.status = ['calling'];
          hasTurnToNext = true;
        } else { // pass
          // will turn to disconnect player to fold if it can not follow;
          if (currentPlayer.status.includes('disconnect')) {
            playersCalledRes.push(this.hanldePlayerCalledChips(roomId, currentPlayer));
          }
          currentPosition = (currentPosition + 1) % (playersQueue.length);
        }
      }
      
      // if didn't has turn to next yet, means it's time to determine victory
      if (!hasTurnToNext) {
        return {
          victoryPlayers: this.determineVictory(roomId),
          playersCalledRes,
        };
      }

      if (this.checkRoomRoundAllCalled(roomId) && this.checkRoomCallEqual(roomId)) {
        if (room.callingSteps === 3) {
          return {
            victoryPlayers: this.determineVictory(roomId),
            playersCalledRes,
          };
        }
        this.turnToNextRound(roomId);
      }
    }

    return { playersCalledRes };
  }

  private checkRoomValidPlayerNumIsOne(roomId: string): PlayerInfoType | undefined {
    const room = this.getRoomInfo(roomId);
    if (room) {
      let validPlayerNum = room.players.size;
      let validPlayer: PlayerInfoType | undefined = undefined;

      room.players.forEach(player => {
        // as long as player is not fold, we count it is valid, even player disconnect;
        if (player.status.includes('fold')) {
          validPlayerNum--;
        } else {
          validPlayer = player;
        }
      });

      if (validPlayerNum === 1) {
        return validPlayer;
      } else if (validPlayerNum === 0) {
        console.log('error', 'none of player is valid', room);
      } else {
        return;
      }
    }

    return;
  }

  private determineVictory(roomId: string): [PlayerInfoType, VictoryInfo][] {
    const room = this.getRoomInfo(roomId);
    let victoryPlayers: [PlayerInfoType, VictoryInfo][] = [];

    if (room) {
      // Only one player valid
      const validPlayer = this.checkRoomValidPlayerNumIsOne(roomId);
      
      if (validPlayer) {
        room.players.forEach(player => {
          if (player.status.includes('fold')) {
            this.foldPlayerLoseToRoom(roomId, player);
          }
        });

        const typedPlayer = validPlayer as unknown as PlayerInfoType;

        typedPlayer.holdCent += typedPlayer.calledChips;
        console.log(typedPlayer.calledChips, room.currentHasChips);
        
        typedPlayer.calledChips = 0;
        typedPlayer.holdCent += room.currentHasChips;
        room.statu = 'settling';
        // all turn to front
        room.publicCards?.forEach(card => card.showFace = 'front');

        victoryPlayers = [[typedPlayer, { getChips: room.currentHasChips }]];
      } else {
        // Compare cards
        const publicCards = room.publicCards.map(card => translateCardToString(card.color, card.number));
        const handMap = new Map<HandClassType, PlayerInfoType>();
        const players = Array.from(room.players.values());

        const hands = players.filter(player => !player.status.includes('fold')).map(player => {
          const hand = Hand.solve([...publicCards, ...player.holdCards.map(card => translateCardToString(card.color, card.number))], room.isShortCards ? 'shortCardsStandard' : 'standard');

          handMap.set(hand, player);
          return hand;
        });

        // Handle winners chips account
        // sort
        const winners = Hand.winners(hands).sort((pre: HandClassType, cur: HandClassType) => {
          const prePlayer = handMap.get(pre);
          const curPlayer = handMap.get(cur);

          if (prePlayer && curPlayer) {
            return prePlayer.calledChips - curPlayer.calledChips;
          } 
          console.log('error', 'can find player', pre, cur, handMap);
          return -1;
        });

        const losePlayers: PlayerInfoType[] = players.filter(player => winners.every((hand: HandClassType) => player.name !== handMap.get(hand)?.name));

        // handle
        room.statu = 'settling';
        winners.forEach((playerHand: HandClassType, handIndex: number) => {
          const player = handMap.get(playerHand);
          if (!player) {
            console.log('error', 'can find player', handMap, playerHand);
            return;
          }
          const getChips = player.calledChips;
          let evenlyChipsPool: number = 0;

          // Account get chips
          losePlayers.forEach(player => {
            if (!player.calledChips) return;

            if (player.calledChips > getChips) {
              evenlyChipsPool += getChips;
              player.calledChips -= getChips;
            } else {
              evenlyChipsPool += player.calledChips;
              player.calledChips = 0;
            }
          });

          // Winners evenly chips
          const eachGetChips = evenlyChipsPool / (winners.length - handIndex);

          for (let index = handIndex; index < winners.length; index++) {
            const player = handMap.get(winners[index]);
            if (!player) {
              console.log('error', 'can find player', handMap, winners, index);
              return;
            }

            const preVictoryPlayerInfo: [PlayerInfoType, VictoryInfo] = victoryPlayers[handIndex] ? victoryPlayers[handIndex] : [player, {
              cardName: winners[index].name,
              getChips: 0,
              cards: winners[index].toArray().map((str: string) => translateStringToCard(str)),
            }];

            victoryPlayers[handIndex] = [preVictoryPlayerInfo[0], {
              ...preVictoryPlayerInfo[1],
              getChips: preVictoryPlayerInfo[1].getChips + eachGetChips,
            }];
            player.holdCent += eachGetChips;
          }
        });

        winners.forEach((playerHand: HandClassType) => {
          const player = handMap.get(playerHand);
          if (!player) {
            console.log('error', 'can find player', handMap, playerHand);
            return;
          }

          player.holdCent += player.calledChips;
          player.calledChips = 0;
        });
      }
    }

    return victoryPlayers;
  }

  turnToNextGame(roomId: string): void {
    const room = this.getRoomInfo(roomId);

    if (room) {
      room.players.forEach(player => {
        if (player.status.includes('disconnect')) {
          this.deletePlayerForRoom(roomId, player.name);
        } else {
          if (player.holdCent === 0) {
            player.holdCent = 100;
            player.debt = 100;
          }
          player.calledChips = 0;
          player.roundCalled = false;
          player.holdCards = [];
          player.status = ['waiting'];
        }
      });

      this.updateRoom(roomId, {
        ...room,
        buttonIndex: (room.buttonIndex + 1) % room.players.size,
        ...this.initWaitingRommInfo,
      });
    }
  }

  startGame(roomId: string, isShortCard = false): RoomInfo | undefined {
    const room = this.getRoomInfo(roomId);

    if (room) {
      const newRoom = distributeCards(room, isShortCard);
      this.updateRoom(roomId, newRoom);
    }

    return room;
  }

  private checkRoomCallEqual(roomId: string): boolean {
    const room = this.getRoomInfo(roomId);

    if (room) {
      let calledChips = -1;

      room.players.forEach(player => {
        if (calledChips === -2) {
          return;
        }

        // pass the fold player and all in player
        if (calledChips === -1 && !player.status.includes('fold') && player.holdCent !== 0) {
          calledChips = player.calledChips;
        }
        // find inequal calledChips and stop to check, pass the fold player and all in player
        if (!player.status.includes('fold') && player.holdCent !== 0 && calledChips > -1 && calledChips !== player.calledChips) {
          calledChips = -2;
          return;
        }
      });

      return calledChips !== -2;
    }

    return false;
  }

  private checkRoomRoundAllCalled(roomId: string): boolean {
    const room = this.getRoomInfo(roomId);

    let allCalled = true;

    if (room) {
      room.players.forEach(player => {
        if (player.roundCalled === false && (player.status.includes('calling') || player.status.includes('waiting'))) {
          allCalled = false;
        }
      });
    }

    return allCalled;
  }

  private clearRoomRoundAllCalled(roomId: string, raisePlayer: PlayerInfoType): void {
    const room = this.getRoomInfo(roomId);
    if (room) {
      room.players.forEach(player => {
        if (player.name === raisePlayer.name) {
          return;
        }

        player.roundCalled = false;
      });
    }
  }

  hanldePlayerCalledChips(
    roomId: string, 
    player: PlayerInfoType, 
    callChips = -1
  ): [PlayerInfoType, string] {
    let playerCalledRes: string = '';

    // probally get null callChips
    if (isEmpty(callChips)) {
      callChips = -1;
    }

    const room = this.getRoomInfo(roomId);
    if (room) {
      let finalCallChips: number = -1;

      // All in
      if (player.holdCent <= callChips) {
        finalCallChips = player.holdCent;
        playerCalledRes = `全下${finalCallChips}`;
      } else if (Math.max(room.currentCallChips, player.blind) > callChips + player.calledChips) {
        // Fold
        if (player.calledChips < player.blind) {
          finalCallChips = player.blind;
        }
        if (player.status.includes('calling')) {
          player.status = ['fold'];
        } else if (player.status.includes('disconnect')) {
          player.status = ['fold', 'disconnect'];
        }
        
        playerCalledRes = '弃牌';
      }

      // Raise
      if (room.currentCallChips < callChips + player.calledChips) {
        this.clearRoomRoundAllCalled(roomId, player);

        if (!playerCalledRes) {
          playerCalledRes = `加注到${callChips + player.calledChips}`;
        }
      } else if (room.currentCallChips === 0 && !playerCalledRes) { // bet
        playerCalledRes = `下注：${callChips}`;
      } else if (room.currentCallChips === callChips + player.calledChips && !playerCalledRes) { // call
        playerCalledRes = `Check，当前最低${room.currentCallChips}`;
      }

      // is not all in and fold, just use called chips
      if (finalCallChips === -1) {
        finalCallChips = Math.max(0, callChips);
      }

      // Transfer chips
      player.calledChips += finalCallChips;
      player.holdCent -= finalCallChips;
      player.roundCalled = true;
      if (player.status.includes('calling')) {
        player.status = ['waiting'];
      }

      room.currentCallChips = player.calledChips;
    }

    return [player, playerCalledRes];
  }

  foldPlayerLoseToRoom(roomId: string, player: PlayerInfoType): void {
    const room = this.getRoomInfo(roomId);

    if (!room) return;

    room.currentHasChips += player.calledChips;
    player.calledChips = 0;
  }

  private turnToNextRound(roomId: string): void {
    const room = this.getRoomInfo(roomId);
    if (!room) return;
    let hasPlayerCalling = true;
    const playersQueue = Array.from(room.players.values());
    let currentPosition = 0;
    let allPlayersClear = false;
    let callback = () => {};

    while ((currentPosition < playersQueue.length && !allPlayersClear) || !hasPlayerCalling) {
      const currentPlayer = playersQueue[currentPosition];
      currentPlayer.roundCalled = false;
      
      if (!hasPlayerCalling) {
        if (currentPlayer.status.includes('disconnect')) {
          callback = () => {
            this.playerCallChips(roomId, currentPlayer.name, 0);
          };
        } else if (!currentPlayer.status.includes('fold')) {
          currentPlayer.status = ['calling'];
          hasPlayerCalling = true;
        }
      } else {
        if (currentPlayer.position === room.buttonIndex) {
          if (currentPlayer.status.includes('fold')) {
            hasPlayerCalling = false;
          } else if (currentPlayer.status.includes('disconnect')) {
            callback = () => {
              this.playerCallChips(roomId, currentPlayer.name, 0);
            };
          } else {
            currentPlayer.status = ['calling'];
          }
        } else if (currentPlayer.status.includes('calling')) {
          currentPlayer.status = ['waiting'];
        }
      }

      if (currentPosition === playersQueue.length - 1) {
        allPlayersClear = true;
      }
      
      currentPosition = (currentPosition + 1) % (playersQueue.length);
    }

    callback();

    // first round will flip three cards
    if (room.callingSteps === 0) {
      if (room.publicCards) {
        room.publicCards.forEach((card, index) => {
          if (index <= 2) {
            card.showFace = 'front';
          }
        });
        room.callingSteps += 1;
      }
    } else {
    // flip next one card in other situation
      const nextCard = room.publicCards?.find(card => card.showFace === 'back');
      if (nextCard) {
        nextCard.showFace = 'front';
      }
  
      room.callingSteps += 1;
    }
  }

  getRoomInfo(roomId: string): RoomInfo | undefined {
    return this.roomMap.get(roomId);
  }

  deleteRoom(roomId: string): boolean {
    return this.roomMap.delete(roomId);
  }

  updateRoom(roomId: string, room: RoomInfo): Map<string, RoomInfo> {
    return this.roomMap.set(roomId, room);
  }

  getAllRooms(): Map<string, RoomInfo> {
    return this.roomMap;
  }
}