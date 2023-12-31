/* eslint-disable id-length */
import { AES } from 'crypto-js';
import { bigBlindValue, getRoomSBOrBBPosition, smallBlindValue } from '../database/roomInfo';
import { CardColor, CardType, PlayerInfoType, RoomInfo } from '../types/roomInfo';
import { privateKey } from './const';

// [ 'A','2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
const suitMap: { [key: string]: CardColor} = {
    h:'hearts', 
    d:'diamonds', 
    c:'clubs', 
    s:'spades',
};

export function initAllCards (shortCards = false) {
    const suits: CardColor[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks = shortCards ? ['A', 6, 7, 8, 9, 10, 'J', 'Q', 'K'] : ['A', 2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K'];

    const deck: CardType[] = [];

    for (const suit of suits) {
        for (const rank of ranks) {
            deck.push({
                key: AES.encrypt(suit + rank, privateKey).toString(),
                color: suit,
                number: rank,
                showFace: 'back',
                statu: 'undistributed',
            });
        }
    }

    return deck;
}

export function distributeCards (room: RoomInfo, shortCards = false): RoomInfo {
    const { players } = room;
    const cards = initAllCards(shortCards);
    const restDeck: number[] = cards.map((_item, index) => index);
  
    // random draw card
    function drawCard () {
        const randomIndex = Math.floor(Math.random() * restDeck.length);
        // splice from restDeck to avoid repeat draw card.
        const drawnCardIndex = restDeck.splice(randomIndex, 1)[0];
    
        const drawnCard = cards[drawnCardIndex];
        return drawnCard;
    }

    // ========== distribute two cards to each player ==========
    const newPlayers = new Map<string, PlayerInfoType>();
    const BBIndex = getRoomSBOrBBPosition(room, 'BB');
    const SBIndex = getRoomSBOrBBPosition(room, 'SB');
  
    players.forEach(player => {
        const holdCards = [];

        for (let index = 0; index < 2; index++) {
            const getCard = drawCard();
            // need to change origin object
            getCard.holder = player.name;
            getCard.statu = 'distributed';
            getCard.showFace = 'front';
            holdCards.push(getCard);
        }

        const getBlind = () => {
            if (player.position === BBIndex) {
                return bigBlindValue;
            } else if (player.position === SBIndex) {
                return smallBlindValue;
            }
            return 0;
        };

        newPlayers.set(player.name, {
            ...player,
            holdCards,
            status: player.position === room.buttonIndex ? ['calling'] : ['waiting'],
            blind: getBlind(),
        } as PlayerInfoType); 
    });

    // ====== distribute five cards to public card pool =======
    const publicCards = [];
    for (let index = 0; index < 5; index++) {
        const getCard = drawCard();
        publicCards.push(getCard);
    }

    return {
        ...room,
        players: newPlayers,
        isShortCards: shortCards,
        publicCards,
        statu: 'started',
        callingSteps: 0,
        currentHasChips: 0,
        currentCallChips: 0,
    };
}

export function translateCardToString (color: string, number: string | number) {
    if (number === 10) {
        return `T${color[0]}`;
    }
    return number + color[0];
}

export function translateStringToCard (str: string): CardType {
    const rank = str.slice(0, str.length - 1);
    const suit = suitMap[str[str.length - 1]];

    return {
        key: AES.encrypt(suit + rank, privateKey).toString(),
        color: suit,
        number: rank,
        showFace: 'front',
        statu: 'undistributed',
    };
}