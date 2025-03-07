export interface HandClassType {
  name: string;
  cards: any[];
  ranks: number[];
  value: number;
  descr: string;
  toArray(): string[];
  toString(): string;
}

declare function Hand(cards: string[], game?: string): HandClassType;

declare namespace Hand {
  function solve(cards: string[], game?: string): HandClassType;
  function winners(hands: HandClassType[]): HandClassType[];
}

export default Hand;