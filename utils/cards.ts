import { AES } from "crypto-js";
import { CardColor, CardType, PlayerInfoType } from "../types/roomInfo";
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

export function distributeCards(cards: CardType[], players: PlayerInfoType[]) {
  const restDeck: number[] = cards.map((_item,index) => index)
  
  // random draw card
  function drawCard() {
    const randomIndex = Math.floor(Math.random() * restDeck.length);
    // splice from restDeck to avoid repeat draw card.
    const drawnCardIndex = restDeck.splice(randomIndex, 1)[0];
    
    const drawnCard = cards[drawnCardIndex];
    return drawnCard;
  }

  players.forEach(player => {
    // distribute two cards to each player
    for (let index = 0; index < 2; index++) {
      let getCard = drawCard();

      getCard.holder = player.name;
      getCard.statu = 'distributed';
      player.holdCards = [...player.holdCards || [], getCard];
    }
  })
}