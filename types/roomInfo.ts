export type CardColor = 'diamonds' | 'hearts' | 'spades' | 'clubs';
export type CardStatu = 'undistributed' | 'distributed' | 'determineVictory';
export type CardShowFace = 'front' | 'back';

export interface CardType {
  key: string;
  color: 'diamonds' | 'hearts' | 'spades' | 'clubs';
  number: number;
  /** which face is the card toward to */
  showFace: 'front' | 'back';
  /** who is the card belong to */
  holder?: string;
  statu: 'undistributed' | 'distributed' | 'determineVictory';
}
export interface PlayerInfoType {
    name: string;
    position: number;
    status: 'calling' | 'waiting';
    holdCards?: CardType[];
    holdCent: number;
}

export interface RoomInfo {
  cards: CardType[];
  publicCards?: CardType[];
  players: PlayerInfoType[];
  buttonIndex: number;
  playerMap: Set<string>;
  statu: 'waiting' | 'started' | 'settling'
}