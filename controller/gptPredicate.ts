import { getRoomInfo } from '../database/roomInfo';
import { CardType, PlayerInfoType } from '../types/roomInfo';
import { getGptResponse } from '../utils/api';
import { translateCardToString, translateStringToCard } from '../utils/cards';

interface GptPredicateRes {
  'winRate': number;
  'publcHighestCards': CardType[];
  'userHighestCards': CardType[];
}

export function getGptPredicate (roomId: string, player: PlayerInfoType, isShortCards: boolean) {
    return new Promise<void | GptPredicateRes>((resolve) => {
        const room = getRoomInfo(roomId);
        if (!room) return;

        getGptResponse({
            publicCards: room.publicCards.map(card => translateCardToString(card.color, card.number)),
            userCards: player.holdCards.map(card => translateCardToString(card.color, card.number)),
            playersCount: room.players.size,
            isShortCards,
        }).then(gptResponse => {
            const temHandledRes = JSON.parse(gptResponse[0].text) as {
              'winRate': number;
              'publcHighestCards': string[];
              'userHighestCards': string[];
            };
  
            const gptPredicateRes: GptPredicateRes = {
                ...temHandledRes,
                publcHighestCards: temHandledRes.publcHighestCards.map(cardStr => translateStringToCard(cardStr)),
                userHighestCards: temHandledRes.userHighestCards.map(cardStr => translateStringToCard(cardStr)),
            };

            resolve(gptPredicateRes);
        }).catch(err => console.log('gptErr', err));
    });
}
