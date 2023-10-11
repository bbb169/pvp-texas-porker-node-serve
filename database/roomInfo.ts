import { PlayerInfoType, RoomInfo, VictoryInfo } from '../types/roomInfo';
import { distributeCards, translateCardToString } from '../utils/cards';
import { HandClassType, HandType } from './pokersolver';
const Hand = require('pokersolver').Hand as HandClassType;

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
    publicCards: [],
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
        status: 'waiting',
        holdCards: [],
        holdCent: 100,
        calledChips: 0,
        blind: 0,
        roundCalled: false,
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

        room.players.forEach((player, userName) => {
            if (playerIndex !== -1) {
                player.position -= 1;
            }
            if (player.name === userName) {
                playerIndex = player.position;
            }
        });
        if (playerIndex === -1) return;

        room.players.delete(userName);
    }
};

// ====================== game proccesses  ====================

export function playerCallChips (roomId: string, userName: string, callChips?: number) {
    return new Promise<[PlayerInfoType, VictoryInfo][] | void>((resolve) => {
        const room = getRoomInfo(roomId);

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
                resolve();
                return;
            }

            // ================= turn to next player calling =============
            let hasTurnToNext = false;
            let currentPosition = (targetPlayer.position + 1) % playersQueue.length;
            const turnToNextCalling = (playerItem: PlayerInfoType) => {
                room?.players.set(playerItem.name, {
                    ...playerItem,
                    status:'calling',
                });

                hasTurnToNext = true;
            };

            while(!hasTurnToNext && currentPosition !== targetPlayer.position) {
                const currentPlayer = playersQueue[currentPosition];
                console.log('currentPlayer', currentPlayer.status, currentPlayer.name, currentPosition, targetPlayer.position);
        
                if (currentPlayer.status === 'waiting') {
                    turnToNextCalling(currentPlayer);
                } else {
                    if (currentPlayer.status === 'disconnect') {
                        hanldePlayerCalledChips(roomId, currentPlayer);
                    }
                    currentPosition = (currentPosition + 1) % (playersQueue.length);
                }
            }

            console.log('hasTurnToNext', hasTurnToNext);
            // if didn't has turn to next yet, means it's time to determine victory
            if (!hasTurnToNext) {
                resolve(determineVictory(roomId));
            }

            if (room.callingSteps === 3) {
                resolve(determineVictory(roomId));
            }

            if (checkRoomRoundAllCalled(roomId) && checkRoomCallEqual(roomId)) {
                turnToNextRound(roomId);
            }
        }

        resolve();
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
            if (player.status === 'fold' || player.status === 'disconnect') {
                validPlayerNum--;
            } else {
                validPlayer = player;
            }
        });
    
        if (validPlayerNum === 1) {
            const typedPlayer = validPlayer as unknown as PlayerInfoType;

            typedPlayer.holdCent += typedPlayer.calledChips;
            typedPlayer.calledChips = 0;
            typedPlayer.holdCent += room.currentHasChips;
            room.statu = 'settling';
            // all turn to front
            room.publicCards?.forEach(card => card.showFace = 'front');

            const hand = Hand.solve([...room.publicCards.map(card => translateCardToString(card.color, card.number)), 
                ...typedPlayer.holdCards.map(card => translateCardToString(card.color, card.number))]);

            victoryPlayers = [[typedPlayer, {
                getChips: room.currentHasChips,
                cardName: hand.name,
            }]];
        } else {
            // =================== compare cards ====================
            const publicCards = room.publicCards.map(card => translateCardToString(card.color, card.number));
            const handMap = new Map<HandType, PlayerInfoType>();

            const hands = Array.from(room.players.values()).map(player => {
                const hand = Hand.solve([...publicCards, ...player.holdCards.map(card => translateCardToString(card.color, card.number))]);

                handMap.set(hand, player);
                return hand;
            });

            const winners = Hand.winners(hands);

            victoryPlayers = winners.map(hand => {
                const player = handMap.get(hand) as PlayerInfoType;

                return [player, {
                    getChips: 0,
                    cardName: hand.name,
                }];
            });
        }
    }

    return victoryPlayers;
}

export function turnToNextGame (roomId: string) {
    const room = getRoomInfo(roomId);

    if (room) {
        room.players.forEach(player => {
            player.holdCards = [];
            player.status = 'waiting';
        });

        updateRoom(roomId, {
            ...room,
            buttonIndex: room.buttonIndex + 1,
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
            if (calledChips === -1 && player.status !== 'fold' && player.holdCent !== 0) {
                calledChips = player.calledChips;
            }
            // find inequal calledChips and stop to check, pass the fold player and all in player
            if (player.status !== 'fold' && player.holdCent !== 0 && calledChips > -1 && calledChips !== player.calledChips) {
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
            if (player.roundCalled === false && player.status !== 'disconnect' && player.status !== 'fold') {
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

            room.players.set(player.name, {
                ...player,
                roundCalled: false,
            });
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
            if (player.status === 'calling') {
                player.status = 'fold';
            }
            playerFold(roomId, player);
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
        if (player.status === 'calling') {
            player.status = 'waiting';
        }

        room.currentCallChips = player.calledChips;
    }
}

/** player fold and lose its called chips */
export function playerFold (roomId: string, player: PlayerInfoType) {
    const room = getRoomInfo(roomId);

    if (!room) return;

    room.currentHasChips += player.calledChips,
    player.calledChips = 0;
}

function turnToNextRound (roomId: string) {
    const room = getRoomInfo(roomId);
    if (!room) return;

    let buttonPlayer: PlayerInfoType | undefined = undefined;

    while (!buttonPlayer) {
        const curPlayer = room.players.values().next().value as PlayerInfoType;
    
        console.log(curPlayer);
        if (curPlayer.position === room.buttonIndex) {
            buttonPlayer = curPlayer;
        }
    }

    if (!buttonPlayer) return;

    buttonPlayer.status = 'calling';
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
    } else if (room.callingSteps === 3) {
    // determine victory
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