import { Injectable } from "@nestjs/common";
import { AES } from "crypto-js";
import {
  CardColor,
  CardType,
  PlayerInfoType,
  RoomInfo,
} from "src/types/roomInfo";
import { privateKey } from "src/utils/const";

const suitMap: { [key: string]: CardColor } = {
  h: "hearts",
  d: "diamonds",
  c: "clubs",
  s: "spades",
};

/**
 * Translate card data to a string representation
 * @param color - Card color/suit
 * @param number - Card number/rank
 * @returns String representation of the card
 */
export function translateCardToString(
  color: string,
  number: string | number
): string {
  if (number === 10) {
    return `T${color[0]}`;
  }
  return `${number}${color[0]}`;
}

/**
 * Translate string representation to card object
 * @param str - String representation of a card
 * @returns Card object
 */
export function translateStringToCard(str: string): CardType {
  const rank = str.slice(0, str.length - 1);
  const suit = suitMap[str[str.length - 1]];

  return {
    key: AES.encrypt(suit + rank, privateKey).toString(),
    color: suit,
    number: rank,
    showFace: "front",
    statu: "undistributed",
  };
}

@Injectable()
export class CardsService {
  /**
   * Initialize deck of cards based on whether to use short cards or not
   * @param shortCards - Whether to use short cards (remove cards 2-5)
   * @returns Array of card objects representing a complete deck
   */
  initAllCards(shortCards = false): CardType[] {
    const suits: CardColor[] = ["hearts", "diamonds", "clubs", "spades"];
    const ranks = shortCards
      ? ["A", 6, 7, 8, 9, 10, "J", "Q", "K"]
      : ["A", 2, 3, 4, 5, 6, 7, 8, 9, 10, "J", "Q", "K"];

    const deck: CardType[] = [];

    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({
          key: AES.encrypt(suit + rank, privateKey).toString(),
          color: suit,
          number: rank,
          showFace: "back",
          statu: "undistributed",
        });
      }
    }

    return deck;
  }

  /**
   * Distribute cards to players and the public pool
   * @param room - Current room information
   * @param shortCards - Whether to use short cards
   * @returns Updated room information with cards distributed
   */
  distributeCards(room: RoomInfo, shortCards = false): RoomInfo {
    const { players } = room;
    const cards = this.initAllCards(shortCards);
    const restDeck: number[] = cards.map((_item, index) => index);

    // Random draw card function
    const drawCard = () => {
      const randomIndex = Math.floor(Math.random() * restDeck.length);
      // Splice from restDeck to avoid repeat draw card
      const drawnCardIndex = restDeck.splice(randomIndex, 1)[0];
      const drawnCard = cards[drawnCardIndex];
      return drawnCard;
    };

    // Distribute two cards to each player
    const newPlayers = new Map<string, PlayerInfoType>();
    const BBIndex = this.getRoomSBOrBBPosition(room, "BB");
    const SBIndex = this.getRoomSBOrBBPosition(room, "SB");

    players.forEach((player) => {
      const holdCards = [];

      for (let index = 0; index < 2; index++) {
        const getCard = drawCard();
        // Need to change origin object
        getCard.holder = player.name;
        getCard.statu = "distributed";
        getCard.showFace = "front";
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
        status:
          player.position === room.buttonIndex ? ["calling"] : ["waiting"],
        blind: getBlind(),
      } as PlayerInfoType);
    });

    // Distribute five cards to public card pool
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
      statu: "started",
      callingSteps: 0,
      currentHasChips: 0,
      currentCallChips: 0,
    };
  }

  /**
   * Get position index for Small Blind or Big Blind
   * @param room - Current room information
   * @param type - Type of position ('SB' or 'BB')
   * @returns Position index
   */
  private getRoomSBOrBBPosition(room: RoomInfo, type: "SB" | "BB"): number {
    if (!room) return -1;

    const players = Array.from(room.players.values());
    const playerSize = players.length;

    // For 2 players, button is SB and other player is BB
    if (playerSize === 2) {
      return type === "SB" ? room.buttonIndex : (room.buttonIndex + 1) % 2;
    }

    // For more than 2 players:
    // SB is 1 position after button, BB is 2 positions after button
    const offset = type === "SB" ? 1 : 2;
    return (room.buttonIndex + offset) % playerSize;
  }
}
