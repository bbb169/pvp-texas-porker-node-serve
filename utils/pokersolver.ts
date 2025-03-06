interface HandClassType {
  name: string;
  cards: any[];
  ranks: number[];
  value: number;
  descr: string;
  toArray: () => string[];
  toString: () => string;
}

const Hand = {
  solve: (cards: string[], game?: string) => {
    return {
      name: 'High Card',
      cards: cards,
      ranks: [1],
      value: 1,
      descr: 'High Card',
      toArray: () => cards,
      toString: () => 'High Card'
    };
  },
  
  winners: (hands: HandClassType[]) => {
    return hands.length > 0 ? [hands[0]] : [];
  }
};

export default Hand;