export type CardColor = 'diamonds' | 'hearts' | 'spades' | 'clubs';
export type CardStatu = 'undistributed' | 'distributed' | 'determineVictory';
export type CardShowFace = 'front' | 'back';

export interface CardType {
  key: string;
  color: 'diamonds' | 'hearts' | 'spades' | 'clubs';
  number: number | string;
  /** which face is the card toward to */
  showFace: 'front' | 'back';
  /** who is the card belong to */
  holder?: string;
  statu: 'undistributed' | 'distributed' | 'determineVictory';
}
export interface PlayerInfoType {
    name: string;
    position: number;
    status: 'disconnect' | 'calling' | 'waiting' | 'fold';
    holdCards: CardType[];
    calledChips: number;
    holdCent: number;
}

export interface RoomInfo {
  publicCards?: CardType[];
  players: Map<string, PlayerInfoType>;
  buttonIndex: number;
  statu: 'waiting' | 'started' | 'settling';
  currentCallChips: number;
  currentHasChips: number;
  callingSteps: number;
}