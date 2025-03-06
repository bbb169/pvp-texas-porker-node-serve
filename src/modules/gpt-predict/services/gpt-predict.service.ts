import { Injectable } from '@nestjs/common';
import { OpenAI } from 'openai';
import { OPENAI_API_KEY } from '../../../utils/chatgptApiKey';
import { getGptPrompt } from '../../../utils/const';
import { CardType, PlayerInfoType } from '../../../types/roomInfo';
import { translateCardToString, translateStringToCard } from '../../../utils/cards';
import { RoomService } from '../../room/services/room.service';

interface GptPromptMessage {
  publicCards: string[];
  userCards: string[];
  playersCount: number;
  isShortCards: boolean;
}

interface GptPredicateRes {
  winRate: number;
  publcHighestCards: CardType[];
  userHighestCards: CardType[];
}

@Injectable()
export class GptPredictService {
  private readonly openai: OpenAI;

  constructor(private readonly roomService: RoomService) {
    this.openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  }

  /**
   * Get response from GPT API based on poker game state
   * @param message - Information about cards and game state
   * @returns Promise resolving to GPT API response
   */
  async getGptResponse(message: GptPromptMessage) {
    try {
      const response = await this.openai.completions.create({
        model: 'gpt-3.5-turbo',
        prompt: getGptPrompt(JSON.stringify(message)),
      });

      return response.choices;
    } catch (error) {
      console.error('Error getting GPT response:', error);
      throw error;
    }
  }

  /**
   * Get poker hand prediction from GPT for a specific player in a room
   * @param roomId - The ID of the room
   * @param player - The player's information
   * @param isShortCards - Whether short deck is being used
   * @returns Promise resolving to prediction results
   */
  async getGptPredicate(roomId: string, player: PlayerInfoType, isShortCards: boolean): Promise<void | GptPredicateRes> {
    return new Promise<void | GptPredicateRes>(async (resolve) => {
      const room = this.roomService.getRoomInfo(roomId);
      if (!room) return;

      try {
        const gptResponse = await this.getGptResponse({
          publicCards: room.publicCards.map(card => translateCardToString(card.color, card.number)),
          userCards: player.holdCards.map(card => translateCardToString(card.color, card.number)),
          playersCount: room.players.size,
          isShortCards,
        });

        if (!gptResponse || gptResponse.length === 0) {
          console.error('Empty response from GPT API');
          return;
        }

        const temHandledRes = JSON.parse(gptResponse[0].text) as {
          winRate: number;
          publcHighestCards: string[];
          userHighestCards: string[];
        };

        const gptPredicateRes: GptPredicateRes = {
          ...temHandledRes,
          publcHighestCards: temHandledRes.publcHighestCards.map(cardStr => translateStringToCard(cardStr)),
          userHighestCards: temHandledRes.userHighestCards.map(cardStr => translateStringToCard(cardStr)),
        };

        resolve(gptPredicateRes);
      } catch (err) {
        console.error('GPT Prediction Error:', err);
        resolve();
      }
    });
  }
}