import { Injectable } from '@nestjs/common';
import { PlayerInfoType, RoomInfo, VictoryInfo, PlayerCallChipsRes } from '../../../types/roomInfo';
import { RoomService } from './room.service';
import { PlayerService } from './player.service';
import { HandClassType } from '../../../types/pokersolver';
import { distributeCards, translateCardToString, translateStringToCard } from '../../../utils/cards';
import Hand from '../../../utils/pokersolver';

@Injectable()
export class GameService {
  constructor(
    private readonly roomService: RoomService,
    private readonly playerService: PlayerService,
  ) {}

  startGame(roomId: string, isShortCard = false): RoomInfo | undefined {
    const room = this.roomService.getRoomInfo(roomId);

    if (room) {
      const newRoom = distributeCards(room, isShortCard);
      this.roomService.updateRoom(roomId, newRoom);
    }

    return room;
  }

  async playerCallChips(roomId: string, userName: string, callChips?: number): Promise<PlayerCallChipsRes> {
    return new Promise<PlayerCallChipsRes>((resolve) => {
      const room = this.roomService.getRoomInfo(roomId);
      const playersCalledRes: [PlayerInfoType, string][] = [];
      
      if (room) {
        const playersQueue = Array.from(room.players.values());

        // =============== handle called chips =================       
        const targetPlayer = playersQueue.find(player => {
          if (player.name === userName) {
            playersCalledRes.push(this.handlePlayerCalledChips(roomId, player, callChips));
            return true;
          }
          return false;
        });

        if (!targetPlayer) {
          console.log('error', 'playerCallChips can\'t find targetPlayer', playersQueue, roomId, userName, callChips);
          return;
        }

        if (this.checkRoomValidPlayerNumIsOne(roomId)) {
          resolve({
            victoryPlayers: this.determineVictory(roomId),
            playersCalledRes,
          });
          return;
        }

        // ================= turn to next player calling =============
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
              playersCalledRes.push(this.handlePlayerCalledChips(roomId, currentPlayer));
            }
            currentPosition = (currentPosition + 1) % (playersQueue.length);
          }
        }
        
        // if didn't has turn to next yet, means it's time to determine victory
        if (!hasTurnToNext) {
          resolve({
            victoryPlayers: this.determineVictory(roomId),
            playersCalledRes,
          });
          return;
        }

        if (this.checkRoomCallEqual(roomId) && this.checkRoomRoundAllCalled(roomId)) {
          if (room.callingSteps === 3) {
            resolve({
              victoryPlayers: this.determineVictory(roomId),
              playersCalledRes,
            });
            return;
          }
          this.turnToNextRound(roomId);
        }
      }

      resolve({ playersCalledRes });
    });
  }

  /**
   * Handle player folding their cards
   * @param roomId - The ID of the room
   * @param userName - The username of the player folding
   * @returns Boolean indicating success
   */
  foldCards(roomId: string, userName: string): boolean {
    const room = this.roomService.getRoomInfo(roomId);
    if (!room) return false;

    const player = room.players.get(userName);
    if (!player) return false;

    player.status.push('fold');
    this.roomService.updateRoom(roomId, room);

    return true;
  }

  private foldPlayerLoseToRoom(roomId: string, player: PlayerInfoType): void {
    const room = this.roomService.getRoomInfo(roomId);

    if (!room) return;

    room.currentHasChips += player.calledChips;
    player.calledChips = 0;
  }

  private checkRoomValidPlayerNumIsOne(roomId: string): PlayerInfoType | undefined {
    const room = this.roomService.getRoomInfo(roomId);
    if (room) {
      let validPlayerNum = room.players.size;
      let validPlayer: PlayerInfoType | undefined = undefined;

      room.players.forEach(player => {
        // as long as player is not fold, we count it as valid, even player disconnect;
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
        return undefined;
      }
    }

    return undefined;
  }

  private determineVictory(roomId: string): [PlayerInfoType, VictoryInfo][] {
    const room = this.roomService.getRoomInfo(roomId);
    let victoryPlayers: [PlayerInfoType, VictoryInfo][] = [];

    if (room) {
      // ================== only one player valid ===============
      const validPlayer = this.checkRoomValidPlayerNumIsOne(roomId);
      
      if (validPlayer) {
        room.players.forEach(player => {
          if (player.status.includes('fold')) {
            this.foldPlayerLoseToRoom(roomId, player);
          }
        });
        
        const typedPlayer = validPlayer as PlayerInfoType;

        typedPlayer.holdCent += typedPlayer.calledChips;
        
        typedPlayer.calledChips = 0;
        typedPlayer.holdCent += room.currentHasChips;
        room.statu = 'settling';
        // all turn to front
        room.publicCards?.forEach(card => card.showFace = 'front');

        victoryPlayers = [[typedPlayer, { getChips: room.currentHasChips }]];
      } else {
        // =================== compare cards ====================
        const publicCards = room.publicCards.map(card => translateCardToString(card.color, card.number));
        const handMap = new Map<HandClassType, PlayerInfoType>();
        const players = Array.from(room.players.values());

        const hands = players.filter(player => !player.status.includes('fold')).map(player => {
          const hand = Hand.solve([...publicCards, ...player.holdCards.map(card => translateCardToString(card.color, card.number))], room.isShortCards ? 'shortCardsStandard' : 'standard');
          
          handMap.set(hand, player);
          return hand;
        });

        // ===================== handle winners chips account ================
        // sort
        const winners = Hand.winners(hands).sort((pre: HandClassType, cur: HandClassType) => {
          const prePlayer = handMap.get(pre);
          const curPlayer = handMap.get(cur);

          if (prePlayer && curPlayer) {
            return prePlayer.calledChips - curPlayer.calledChips;
          } 
          console.log('error', 'can find player', handMap, pre, cur, handMap);
          return -1;
        });

        const losePlayers: PlayerInfoType[] = players.filter(player => winners.every((hand: HandClassType) => player.name !== handMap.get(hand)?.name));

        // =================== winners evnely chips ====================
        room.statu = 'settling';
        winners.forEach((playerHand: HandClassType, handIndex: number) => {
          const player = handMap.get(playerHand);
          if (!player) {
            console.log('error', 'can find player', handMap, playerHand);
            return;
          }

          const getChips = player.calledChips;
          let evenlyChipsPool: number = 0;

          // ====================== account get chips =====================
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

          // =================== winners evnely chips ====================
          const eachGetChips = evenlyChipsPool / (winners.length - handIndex);

          for (let index = handIndex; index < winners.length; index++) {
            const player = handMap.get(winners[index]);
            if (!player) {
              console.log('error', 'can find player', handMap, winners, index);
              return;
            }

            victoryPlayers[handIndex] = [player, {
              ...victoryPlayers[handIndex] ? victoryPlayers[handIndex][1] : { getChips: 0, cards: undefined },
              getChips: (victoryPlayers[handIndex] ? victoryPlayers[handIndex][1].getChips : 0) + eachGetChips,
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

  private checkRoomCallEqual(roomId: string): boolean {
    const room = this.roomService.getRoomInfo(roomId);

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
    const room = this.roomService.getRoomInfo(roomId);

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
    const room = this.roomService.getRoomInfo(roomId);
    if (room) {
      room.players.forEach(player => {
        if (player.name === raisePlayer.name) {
          return;
        }
        
        player.roundCalled = false;
      });
    }
  }

  private turnToNextRound(roomId: string): void {
    const room = this.roomService.getRoomInfo(roomId);
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

    // first round will filp three cards
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
    // filp next one card in other situation
      const nextCard = room.publicCards?.find(card => card.showFace === 'back');
      if (nextCard) {
        nextCard.showFace = 'front';
      }
  
      room.callingSteps += 1;
    }
  }

  private handlePlayerCalledChips(
    roomId: string, 
    player: PlayerInfoType, 
    /** make player fold */
    callChips = -1
  ): [PlayerInfoType, string] {
    let playerCalledRes: string = '';

    // probally get null callChips
    if (callChips === null || callChips === undefined) {
      callChips = -1;
    }

    const room = this.roomService.getRoomInfo(roomId);
    if (room) {
      let finalCallChips: number = -1;

      // ================= all in ==============
      if (player.holdCent <= callChips) {
        finalCallChips = player.holdCent;
        playerCalledRes = `全下${finalCallChips}`;
      } else if (Math.max(room.currentCallChips, player.blind) > callChips + player.calledChips) {
        // ============== fold =================
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

      // ================= raise ================
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

      // ================== transfer chips=======================
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

  turnToNextGame(roomId: string): void {
    const room = this.roomService.getRoomInfo(roomId);

    if (room) {
      room.players.forEach(player => {
        if (player.status.includes('disconnect')) {
          this.roomService.deletePlayerForRoom(roomId, player.name);
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

      this.roomService.updateRoom(roomId, {
        ...room,
        buttonIndex: (room.buttonIndex + 1) % room.players.size,
        ...this.roomService.initWaitingRommInfo,
      });
    }
  }
}