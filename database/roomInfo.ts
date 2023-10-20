import { HandClassType } from '../types/pokersolver';
import { PlayerInfoType, RoomInfo, VictoryInfo } from '../types/roomInfo';
import { distributeCards, translateCardToString, translateStringToCard } from '../utils/cards';
import Hand from '../utils/pokersolver';

const roomMap = new Map<string, RoomInfo>();
export const bigBlindValue = 5;
export const smallBlindValue = 3;

export const initWaitingRommInfo: Omit<Omit<RoomInfo, 'buttonIndex'>, 'players'> = {
    statu: 'waiting',
    currentCallChips: 0,
    currentHasChips: 0,
    callingSteps: 0,
    bigBlind: bigBlindValue,
    smallBlind: smallBlindValue,
    publicCards: [],
    isShortCards: false,
};

export const createRoom = (createPlayer: PlayerInfoType, roomId: string) => {
    const roomInfo: RoomInfo = {
        buttonIndex: 0,
        players: new Map().set(createPlayer.name, createPlayer),
        ...initWaitingRommInfo,
    };

    roomMap.set(roomId, roomInfo);

    return roomInfo;
};

export const creatPlayer = (userName: string, roomId?: string): PlayerInfoType => {
    let position = 0;

    if (roomId) {
        const room = getRoomInfo(roomId);
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
};

export const addPlayerForRoom = (roomId: string, addPlayer: PlayerInfoType) => {
    const room = roomMap.get(roomId);
    if (room && !room.players.has(addPlayer.name)) {
        room.players.set(addPlayer.name, addPlayer);
    }
};

export const deletePlayerForRoom = (roomId: string, userName: string) => {
    const room = roomMap.get(roomId);

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
            updateRoom(roomId, {
                ...room,
                buttonIndex: (room.buttonIndex + 1) % room.players.size,
            });
        }
    }
};

export const updatePlayerActiveTime = (roomId: string, userName: string) => {
    const player = roomMap.get(roomId)?.players.get(userName);

    if (player) {
        player.activeTime = new Date().getSeconds();
    }
};

// ====================== game proccesses  ====================

export function playerCallChips (roomId: string, userName: string, callChips?: number) {
    return new Promise<[PlayerInfoType, VictoryInfo][] | boolean>((resolve) => {
        const room = getRoomInfo(roomId);
        let hasTurnToNextRound = false;
        
        if (room) {
            const playersQueue = Array.from(room.players.values());

            // =============== handle called chips =================       
            const targetPlayer = playersQueue.find(player => {
                if (player.name === userName) {
                    hanldePlayerCalledChips(roomId, player, callChips);
                    return true;
                }
                return false;
            });

            if (!targetPlayer) {
                throw new Error('playerCallChips can\'t find targetPlayer');
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
                    if (currentPlayer.status.includes('disconnect')) {
                        hanldePlayerCalledChips(roomId, currentPlayer);
                    }
                    currentPosition = (currentPosition + 1) % (playersQueue.length);
                }
            }

            // if didn't has turn to next yet, means it's time to determine victory
            if (!hasTurnToNext) {
                resolve(determineVictory(roomId));
            }

            if (checkRoomRoundAllCalled(roomId) && checkRoomCallEqual(roomId)) {
                if (room.callingSteps === 3) {
                    resolve(determineVictory(roomId));
                }
                turnToNextRound(roomId);
                hasTurnToNextRound = true;
            }
        }

        resolve(hasTurnToNextRound);
    });
}

function determineVictory (roomId: string): [PlayerInfoType, VictoryInfo][] {
    const room = getRoomInfo(roomId);
    let victoryPlayers:[PlayerInfoType, VictoryInfo][] = [];

    if (room) {
        // ================== only one player valid ===============
        let validPlayerNum = room.players.size;
        let validPlayer: PlayerInfoType | undefined = undefined;

        room.players.forEach(player => {
            if (player.status.includes('fold')) {
                validPlayerNum--;
            } else {
                validPlayer = player;
            }
        });
    
        if (validPlayerNum === 1) {
            room.players.forEach(player => {
                if (player.status.includes('fold')) {
                    foldPlayerLoseToRoom(roomId, player);
                }
            });

            const typedPlayer = validPlayer as unknown as PlayerInfoType;

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

            const hands = players.map(player => {
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
                throw new Error('can find player');
            });

            const losePlayers: PlayerInfoType[] = players.filter(player => winners.every((hand: HandClassType) => player.name !== handMap.get(hand)?.name));

            // handle
            room.statu = 'settling';
            winners.forEach((playerHand: HandClassType, handIndex: number) => {
                const player = handMap.get(playerHand);
                if (!player) throw new Error('can find player');
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
                    if (!player) throw new Error('can find player');

                    const preVictoryPlayerInfo:[PlayerInfoType, VictoryInfo] = victoryPlayers[handIndex] ? victoryPlayers[handIndex] : [player, {
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
                if (!player) throw new Error('can find player');

                player.holdCent += player.calledChips;
                player.calledChips = 0;
            });
        }
    }

    return victoryPlayers;
}

export function turnToNextGame (roomId: string) {
    const room = getRoomInfo(roomId);

    if (room) {
        room.players.forEach(player => {
            if (player.status.includes('disconnect')) {
                deletePlayerForRoom(roomId, player.name);
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

        updateRoom(roomId, {
            ...room,
            buttonIndex: (room.buttonIndex + 1) % room.players.size,
            ...initWaitingRommInfo,
        });
    }
}

export function startGame (roomId: string, isShortCard = false) {
    const room = getRoomInfo(roomId);

    if (room) {
        const newRoom = distributeCards(room, isShortCard);
        updateRoom(roomId, newRoom);
    }

    return room;
}

function checkRoomCallEqual (roomId: string) {
    const room = getRoomInfo(roomId);

    if (room) {
        let calledChips = -1;

        room.players.forEach(player => {
            if (calledChips === -2) {
                return;
            }

            // pass the fold player and all in player
            if (calledChips === -1 && !player.status.includes('fold')  && player.holdCent !== 0) {
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

function checkRoomRoundAllCalled (roomId: string) {
    const room = getRoomInfo(roomId);

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

function clearRoomRoundAllCalled (roomId: string, raisePlayer: PlayerInfoType) {
    const room = getRoomInfo(roomId);
    if (room) {
        room.players.forEach(player => {
            if (player.name === raisePlayer.name) {
                return;
            }

            player.roundCalled = false;
        });
    }
}

/** if called chips less than minimum callable chips, will be regarded as fold */
export function hanldePlayerCalledChips (roomId: string, player: PlayerInfoType, callChips = 0) {
    const room = getRoomInfo(roomId);
    if (room) {
        let finalCallChips: number = -1;
    
        // ================= all in ==============
        if (player.holdCent <= callChips) {
            finalCallChips = player.holdCent;
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
            // playerFold(roomId, player);
        }

        // ================= raise ================
        if (room.currentCallChips < callChips + player.calledChips) {
            clearRoomRoundAllCalled(roomId, player);
        }

        // is not all in, just use called chips
        if (finalCallChips === -1) {
            finalCallChips = callChips;
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
}

/** player fold and lose its called chips */
export function foldPlayerLoseToRoom (roomId: string, player: PlayerInfoType) {
    const room = getRoomInfo(roomId);

    if (!room) return;

    room.currentHasChips += player.calledChips,
    player.calledChips = 0;
}

function turnToNextRound (roomId: string) {
    const room = getRoomInfo(roomId);
    if (!room) return;

    room.players.forEach(player => {
        player.roundCalled = false;
        if (player.position === room.buttonIndex) {
            player.status = ['calling'];
        } else if (player.status.includes('calling')) {
            player.status = ['waiting'];
        }
    });

    // first calling to equal will filp three cards
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
// ====================== game proccesses  ====================

export const getRoomInfo = (roomId: string) => {
    return roomMap.get(roomId);
};

export const deleteRoom = (roomId: string) => {
    return roomMap.delete(roomId);
};

export const updateRoom = (roomId: string, room: RoomInfo) => {
    return roomMap.set(roomId, room);
};

export const getRoomSBOrBBPosition = (room: RoomInfo, type: 'SB' | 'BB'): number => {
    let result = -1;

    if (room) {
        const tempPosition = room.buttonIndex - (type === 'BB' ? 2 : 1);

        if (tempPosition < 0) {
            // last one
            result = room.players.size + tempPosition;
        } else {
            result = tempPosition;
        }
    }

    return result;
};