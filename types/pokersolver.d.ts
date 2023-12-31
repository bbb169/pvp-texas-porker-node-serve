/* eslint-disable no-unused-vars */

export class HandClassType {
    name: string;
    game: string;
    /**
   * Find highest ranked hands and remove any that don't qualify or lose to another hand.
   * @param  {Array} hands Hands to evaluate.
   * @return {Array}       Winning hands.
  */
    winners(hands: HandClassType[]): HandClassType[];
    /**
   * Build and return the best hand.
   * @param  {Array} cards Array of cards (['Ad', '3c', 'Th', ...]).
   * @param  {String} game Game being played.
   * @param  {Boolean} canDisqualify Check for a qualified hand.
   * @return {Hand}       Best hand.
  */
    solve(cards: string[], game?: string, canDisqualify?: boolean): HandClassType;
    toArray():string[];
}