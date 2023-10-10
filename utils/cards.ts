import { AES } from "crypto-js";
import { CardColor, CardType, PlayerInfoType, RoomInfo } from "../types/roomInfo";
import { privateKey } from "./const";

// [ 'A','2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
export function initAllCards(shortCards = false) {
  const suits: CardColor[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks = shortCards ? [1,6,7,8,9,10,11,12,13] : [1,2,3,4,5,6,7,8,9,10,11,12,13];

  const deck: CardType[] = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({
        key: AES.encrypt(suit + rank, privateKey).toString(),
        color: suit,
        number: rank,
        showFace: 'back',
        statu: 'undistributed'
      });
    }
  }

  return deck;
}

export function distributeCards(room: RoomInfo, shortCards = false): RoomInfo {
  const { players } = room;
  const cards = initAllCards(shortCards);

  let restDeck: number[]

  restDeck = cards.map((_item,index) => index)
  
  // random draw card
  function drawCard() {
    const randomIndex = Math.floor(Math.random() * restDeck.length);
    // splice from restDeck to avoid repeat draw card.
    const drawnCardIndex = restDeck.splice(randomIndex, 1)[0];
    
    const drawnCard = cards[drawnCardIndex];
    return drawnCard;
  }

  // ========== distribute two cards to each player ==========
  const newPlayers = new Map<string, PlayerInfoType>();
  players.forEach(player => {
    let holdCards = [];

    for (let index = 0; index < 2; index++) {
      let getCard = drawCard();
      // need to change origin object
      getCard.holder = player.name;
      getCard.statu = 'distributed';
      getCard.showFace = 'front';
      holdCards.push(getCard)
    }

    newPlayers.set(player.name, {
      ...player,
      holdCards,
      status: player.position === room.buttonIndex ? 'calling' : 'waiting',
    } as PlayerInfoType) 
  })

  // ====== distribute five cards to public card pool =======
  let publicCards = [];
  for (let index = 0; index < 5; index++) {
    let getCard = drawCard();
    publicCards.push(getCard)
  }

  return {
    ...room,
    players: newPlayers,
    publicCards,
    statu: 'started',
    callingSteps: 0,
    currentHasChips: 0,
    currentCallChips: 0,
  }
}