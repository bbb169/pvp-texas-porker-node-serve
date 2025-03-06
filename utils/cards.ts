import { AES } from 'crypto-js';
import { CardColor, CardType, PlayerInfoType, RoomInfo } from '../types/roomInfo';
import { privateKey } from './const';

// [ 'A','2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
const suitMap: { [key: string]: CardColor} = {
    h: 'hearts', 
    d: 'diamonds', 
    c: 'clubs', 
    s: 'spades',
};

export function initAllCards(shortCards = false): CardType[] {
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

export function distributeCards(room: RoomInfo, shortCards = false): RoomInfo {
    const { players } = room;
    const cards = initAllCards(shortCards);
    const restDeck: number[] = cards.map((_item, index) => index);
  
    // Random draw card function
    function drawCard() {
        const randomIndex = Math.floor(Math.random() * restDeck.length);
        // Splice from restDeck to avoid repeat draw card
        const drawnCardIndex = restDeck.splice(randomIndex, 1)[0];
    
        const drawnCard = cards[drawnCardIndex];
        return drawnCard;
    }

    // ========== distribute two cards to each player ==========
    const newPlayers = new Map<string, PlayerInfoType>();
    // Get BB and SB positions
    const BBIndex = (room.buttonIndex + 2) % players.size;
    const SBIndex = (room.buttonIndex + 1) % players.size;
  
    players.forEach(player => {
        const holdCards = [];

        for (let index = 0; index < 2; index++) {
            const getCard = drawCard();
            // Need to change origin object
            getCard.holder = player.name;
            getCard.statu = 'distributed';
            getCard.showFace = 'front';
            holdCards.push(getCard);
        }

        const getBlind = () => {
            if (player.position === BBIndex) {
                return room.bigBlind;
            } else if (player.position === SBIndex) {
                return room.smallBlind;
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

export function translateCardToString(color: CardColor, number: number | string): string {
    const colorMap: Record<CardColor, string> = {
        'hearts': 'h',
        'diamonds': 'd',
        'clubs': 'c',
        'spades': 's'
    };
    
    if (number === 10) {
        return `T${colorMap[color]}`;
    }
    
    const numberStr = number === 'A' ? 'A' : 
                     number === 'J' ? 'J' : 
                     number === 'Q' ? 'Q' : 
                     number === 'K' ? 'K' : String(number);
                     
    return numberStr + colorMap[color];
}

export function translateStringToCard(str: string): CardType {
    const rank = str.slice(0, str.length - 1);
    const suit = suitMap[str[str.length - 1]];

    return {
        key: AES.encrypt(suit + rank, privateKey).toString(),
        color: suit,
        number: rank === 'T' ? 10 : rank,
        showFace: 'front',
        statu: 'undistributed',
    };
}