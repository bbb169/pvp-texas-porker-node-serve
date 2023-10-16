/* eslint-disable prefer-spread */
/* eslint-disable prefer-const */
/* eslint-disable id-length */
/* eslint-disable no-var */
/* eslint-disable @typescript-eslint/no-explicit-any */
let values = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

/**
   * Base Card class that defines a single card.
   */
class Card {
    value: any;
    suit: any;
    rank: number;
    wildValue: any;
    constructor (str: string) {
        this.value = str.substr(0, 1);
        this.suit = str.substr(1, 1).toLowerCase();
        this.rank = values.indexOf(this.value);
        this.wildValue = str.substr(0, 1);
    }

    toString () {
        return this.wildValue.replace('T', '10') + this.suit;
    }

    static sort (a: { rank: number; }, b: { rank: number; }) {
        if (a.rank > b.rank) {
            return -1;
        } else if (a.rank < b.rank) {
            return 1;
        } 
        return 0;
    }
}

/**
   * Base Hand class that handles comparisons of full hands.
   */
class Hand {
    cardPool: any[];
    cards: any[];
    suits: { [key: string]: {
        suit: string; rank: number; 
    }[] };
    values: any[];
    wilds: any[];
    name: any;
    game: any;
    sfLength: number;
    alwaysQualifies: boolean;
    rank: number;
    isPossible: any;
    constructor (cards: any[], name: any, game: { descr: string; }, canDisqualify?: any) {
        this.cardPool = [];
        this.cards = [];
        this.suits = {};
        this.values = [];
        this.wilds = [];
        this.name = name;
        this.game = game;
        this.sfLength = 0;
        this.alwaysQualifies = true;

        // Qualification rules apply for dealer's hand.
        // Also applies for single player games, like video poker.
        if (canDisqualify && this.game.lowestQualified) {
            this.alwaysQualifies = false;
        }

        // Ensure no duplicate cards in standard game.
        if (game.descr === 'standard' && new Set(cards).size !== cards?.length) {
            throw new Error('Duplicate cards');
        }
      
        // Get rank based on game.
        const handRank = this.game.handValues.length;
        for (var i = 0; i < this.game.handValues.length; i++) {
            if (this.game.handValues[i] === this.constructor) {
                break;
            }
        }
        this.rank = handRank - i;

        // Set up the pool of cards.
        this.cardPool = cards.map((c: string) => {
            return (typeof c === 'string') ? new Card(c) : c;
        });

        // Fix the card ranks for wild cards, and sort.
        for (var i = 0; i < this.cardPool.length; i++) {
            card = this.cardPool[i];
            if (card.value === this.game.wildValue) {
                card.rank = -1;
            }
        }
        this.cardPool = this.cardPool.sort(Card.sort);

        // Create the arrays of suits and values.
        let obj; let obj1; let key; let key1; var card;
        for (var i = 0; i < this.cardPool.length; i++) {
        // Make sure this value already exists in the object.
            card = this.cardPool[i];

            // We do something special if this is a wild card.
            if (card.rank === -1) {
                this.wilds.push(card);
            } else {
                (obj = this.suits)[key = card.suit] || (obj[key] = []);
                (obj1 = this.values)[key1 = card.rank] || (obj1[key1] = []);

                // Add the value to the array for that type in the object.
                this.suits[card.suit].push(card);
                this.values[card.rank].push(card);
            }
        }
        
        this.values.reverse();
        this.isPossible = (this as any).solve();
    }

    /**
     * Compare current hand with another to determine which is the winner.
     * @param  {Hand} a Hand to compare to.
     * @return {Number}
     */
    compare (a: { rank: number; cards: { rank: number; }[]; }) {
        if (this.rank < a.rank) {
            return 1;
        } else if (this.rank > a.rank) {
            return -1;
        }

        let result = 0;
        for (let i = 0; i <= 4; i++) {
            if (this.cards[i] && a.cards[i] && this.cards[i].rank < a.cards[i].rank) {
                result = 1;
                break;
            } else if (this.cards[i] && a.cards[i] && this.cards[i].rank > a.cards[i].rank) {
                result = -1;
                break;
            }
        }

        return result;
    }

    /**
     * Determine whether a hand loses to another.
     * @param  {Hand} hand Hand to compare to.
     * @return {Boolean}
     */
    loseTo (hand: any) {
        return (this.compare(hand) > 0);
    }

    /**
     * Determine the number of cards in a hand of a rank.
     * @param  {Number} val Index of this.values.
     * @return {Number} Number of cards having the rank, including wild cards.
     */
    getNumCardsByRank (val: number) {
        const cards = this.values[val];
        let checkCardsLength = (cards) ? cards.length : 0;

        for (let i = 0; i < this.wilds.length; i++) {
            if (this.wilds[i].rank > -1) {
                continue;
            } else if (cards) {
                if (this.game.wildStatus === 1 || cards[0].rank === values.length - 1) {
                    checkCardsLength += 1;
                }
            } else if (this.game.wildStatus === 1 || val === values.length - 1) {
                checkCardsLength += 1;
            }
        }

        return checkCardsLength;
    }

    /**
     * Determine the cards in a suit for a flush.
     * @param  {String} suit Key for this.suits.
     * @param  {Boolean} setRanks Whether to set the ranks for the wild cards.
     * @return {Array} Cards having the suit, including wild cards.
     */
    getCardsForFlush (suit: string, setRanks: boolean) {
        let cards = (this.suits[suit] || []).sort(Card.sort);

        for (let i = 0; i < this.wilds.length; i++) {
            const wild = this.wilds[i];

            if (setRanks) {
                let j = 0;
                while (j < values.length && j < cards.length) {
                    if (cards[j].rank === values.length - 1 - j) {
                        j += 1;
                    } else {
                        break;
                    }
                }
                wild.rank = values.length - 1 - j;
                wild.wildValue = values[wild.rank];
            }

            cards.push(wild);
            cards = cards.sort(Card.sort);
        }

        return cards;
    }

    /**
     * Resets the rank and wild values of the wild cards.
     */
    resetWildCards () {
        for (let i = 0; i < this.wilds.length; i++) {
            this.wilds[i].rank = -1;
            this.wilds[i].wildValue = this.wilds[i].value;
        }
    }

    /**
     * Highest card comparison.
     * @return {Array} Highest cards
     */
    nextHighest () {
        let picks;
        let excluding: any[] = [];
        excluding = excluding.concat(this.cards);

        picks = this.cardPool.filter((card) => {
            if (excluding.indexOf(card) < 0) {
                return true;
            }
        });

        // Account for remaining wild card when it must be ace.
        if (this.game.wildStatus === 0) {
            for (let i = 0; i < picks.length; i++) {
                const card = picks[i];
                if (card.rank === -1) {
                    card.wildValue = 'A';
                    card.rank = values.length - 1;
                }
            }
            picks = picks.sort(Card.sort);
        }

        return picks;
    }

    /**
     * Return list of contained cards in human readable format.
     * @return {String}
     */
    toString () {
        const cards = this.cards.map((c) => {
            return c.toString();
        });

        return cards.join(', ');
    }

    /**
     * Return array of contained cards.
     * @return {Array}
     */
    toArray () {
        const cards = this.cards.map((c) => {
            return c.toString();
        });

        return cards;
    }

    /**
     * Determine if qualifying hand.
     * @return {Boolean}
     */
    qualifiesHigh () {
        if (!this.game.lowestQualified || this.alwaysQualifies) {
            return true;
        }

        return (this.compare(Hand.solve(this.game.lowestQualified, this.game)) <= 0);
    }

    /**
     * Find highest ranked hands and remove any that don't qualify or lose to another hand.
     * @param  {Array} hands Hands to evaluate.
     * @return {Array}       Winning hands.
     */
    static winners (hands: any[]) {
        hands = hands.filter((h: { qualifiesHigh: () => any; }) => {
            return h.qualifiesHigh();
        });

        const highestRank = Math.max.apply(Math, hands.map((h: { rank: any; }) => {
            return h.rank;
        }));

        hands = hands.filter((h: { rank: number; }) => {
            return h.rank === highestRank;
        });

        hands = hands.filter((h: { loseTo: (arg0: any) => boolean; }) => {
            let lose = false;
            for (let i = 0; i < hands.length; i++) {
                lose = h.loseTo(hands[i]);
                if (lose) {
                    break;
                }
            }

            return !lose;
        });

        return hands;
    }

    /**
     * Build and return the best hand.
     * @param  {Array} cards Array of cards (['Ad', '3c', 'Th', ...]).
     * @param  {String} game Game being played.
     * @param  {Boolean} canDisqualify Check for a qualified hand.
     * @return {Hand}       Best hand.
     */
    static solve (cards: string[], game?: any, canDisqualify?: boolean) {
        game = game || 'standard';
        game = (typeof game === 'string') ? new Game(game) : game;
        cards = cards || [''];
        if (game.descr === 'shortCardsStandard') {
            values = ['1', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
        } else {
            values = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
        }
        
        const hands = game.handValues;
        let result = null;

        for (let i = 0; i < hands.length; i++) {
            result = new hands[i](cards, game, canDisqualify);
            if (result.isPossible) {
                break;
            }
        }

        return result;
    }

    /**
     * Separate cards based on if they are wild cards.
     * @param  {Array} cards Array of cards (['Ad', '3c', 'Th', ...]).
     * @param  {Game} game Game being played.
     * @return {Array} [wilds, nonWilds] Wild and non-Wild Cards.
     */
    static stripWilds (cards: string | any[]) {
        let card; let wilds; let nonWilds;
        cards = cards || [''];
        wilds = [];
        nonWilds = [];

        for (let i = 0; i < cards.length; i++) {
            card = cards[i];
            if (card.rank === -1) {
                wilds.push(cards[i]);  
            } else {
                nonWilds.push(cards[i]);  
            }
        }

        return [wilds, nonWilds];
    }
}

class StraightFlush extends Hand {
    descr!: string;
    constructor (cards: any, game: any, canDisqualify: any) {
        super(cards, 'Straight Flush', game, canDisqualify);
    }

    solve () {
        let cards;
        this.resetWildCards();
        let possibleStraight = null;
        var suit: any;
        let nonCards: any[] = [];

        for (suit in this.suits) {
            cards = this.getCardsForFlush(suit, false);
            if (cards && cards.length >= this.game.sfQualify) {
                possibleStraight = cards;
                break;
            } 
        }

        if (possibleStraight) {
            if (this.game.descr !== 'standard') {
                for (suit in this.suits) {
                    if (possibleStraight[0].suit !== suit) {
                        nonCards = nonCards.concat(this.suits[suit] || []);
                        nonCards = Hand.stripWilds(nonCards)[1];
                    }
                }
            }
            const straight = new Straight(possibleStraight, this.game);
            if (straight.isPossible) {
                this.cards = straight.cards;
                this.cards = this.cards.concat(nonCards);
                this.sfLength = straight.sfLength;
            }
        }

        if (this.cards[0] && this.cards[0].rank === 13) {
            this.descr = 'Royal Flush';
        } else if (this.cards.length >= this.game.sfQualify) {
            this.descr = `${this.name}, ${this.cards[0].toString().slice(0, -1)}${suit} High`;
        }

        return this.cards.length >= this.game.sfQualify;
    }
}

class RoyalFlush extends StraightFlush {
    constructor (cards: any, game: any, canDisqualify: any) {
        super(cards, game, canDisqualify);
    }

    solve () {
        this.resetWildCards();
        const result = super.solve();
        return result && this.descr === 'Royal Flush';
    }
}

class NaturalRoyalFlush extends RoyalFlush {
    constructor (cards: any, game: any, canDisqualify: any) {
        super(cards, game, canDisqualify);
    }

    solve () {
        let i = 0;
        this.resetWildCards();
        let result = super.solve();
        if (result && this.cards) {
            for (i = 0; i < this.game.sfQualify && i < this.cards.length; i++) {
                if (this.cards[i].value === this.game.wildValue) {
                    result = false;
                    this.descr = 'Wild Royal Flush';
                    break;
                }
            }
            if (i === this.game.sfQualify) {
                this.descr = 'Royal Flush';
            }
        }
        return result;
    }
}

class WildRoyalFlush extends RoyalFlush {
    constructor (cards: any, game: any, canDisqualify: any) {
        super(cards, game, canDisqualify);
    }

    solve () {
        let i = 0;
        this.resetWildCards();
        let result = super.solve();
        if (result && this.cards) {
            for (i = 0; i < this.game.sfQualify && i < this.cards.length; i++) {
                if (this.cards[i].value === this.game.wildValue) {
                    this.descr = 'Wild Royal Flush';
                    break;
                }
            }
            if (i === this.game.sfQualify) {
                result = false;
                this.descr = 'Royal Flush';
            }
        }
        return result;
    }
}

class FiveOfAKind extends Hand {
    descr!: string;
    constructor (cards: any, game: any, canDisqualify: any) {
        super(cards, 'Five of a Kind', game, canDisqualify);
    }

    solve () {
        this.resetWildCards();

        for (let i = 0; i < this.values.length; i++) {
            if (this.getNumCardsByRank(i) === 5) {
                this.cards = this.values[i] || [];
                for (let j = 0; j < this.wilds.length && this.cards.length < 5; j++) {
                    const wild = this.wilds[j];
                    if (this.cards) {
                        wild.rank = this.cards[0].rank;
                    } else {
                        wild.rank = values.length - 1;
                    }
                    wild.wildValue = values[wild.rank];
                    this.cards.push(wild);
                }
                this.cards = this.cards.concat(this.nextHighest().slice(0, this.game.cardsInHand - 5));
                break;
            }
        }

        if (this.cards.length >= 5) {
            this.descr = `${this.name}, ${this.cards[0].toString().slice(0, -1)}'s`;
        }

        return this.cards.length >= 5;
    }
}

class FourOfAKind extends Hand {
    descr!: string;
    constructor (cards: any, game: any, canDisqualify: any) {
        super(cards, 'Four of a Kind', game, canDisqualify);
    }

    solve () {
        this.resetWildCards();

        for (let i = 0; i < this.values.length; i++) {
            if (this.getNumCardsByRank(i) === 4) {
                this.cards = this.values[i] || [];
                for (let j = 0; j < this.wilds.length && this.cards.length < 4; j++) {
                    const wild = this.wilds[j];
                    if (this.cards) {
                        wild.rank = this.cards[0].rank;
                    } else {
                        wild.rank = values.length - 1;
                    }
                    wild.wildValue = values[wild.rank];
                    this.cards.push(wild);
                }

                this.cards = this.cards.concat(this.nextHighest().slice(0, this.game.cardsInHand - 4));
                break;
            }
        }

        if (this.cards.length >= 4) {
            if (this.game.noKickers) {
                this.cards.length = 4;
            }

            this.descr = `${this.name}, ${this.cards[0].toString().slice(0, -1)}'s`;
        }

        return this.cards.length >= 4;
    }
}

class FullHouse extends Hand {
    descr!: string;
    constructor (cards: any, game: any, canDisqualify: any) {
        super(cards, 'Full House', game, canDisqualify);
    }

    solve () {
        let cards;
        this.resetWildCards();

        for (var i = 0; i < this.values.length; i++) {
            if (this.getNumCardsByRank(i) === 3) {
                this.cards = this.values[i] || [];
                for (var j = 0; j < this.wilds.length && this.cards.length < 3; j++) {
                    var wild = this.wilds[j];
                    if (this.cards) {
                        wild.rank = this.cards[0].rank;
                    } else {
                        wild.rank = values.length - 1;
                    }
                    wild.wildValue = values[wild.rank];
                    this.cards.push(wild);
                }
                break;
            }
        }

        if (this.cards.length === 3) {
            for (i = 0; i < this.values.length; i++) {
                cards = this.values[i];
                if (cards && this.cards[0].wildValue === cards[0].wildValue) {
                    continue;
                }
                if (this.getNumCardsByRank(i) >= 2) {
                    this.cards = this.cards.concat(cards || []);
                    for (var j = 0; j < this.wilds.length; j++) {
                        var wild = this.wilds[j];
                        if (wild.rank !== -1) {
                            continue;
                        }
                        if (cards) {
                            wild.rank = cards[0].rank;
                        } else if (this.cards[0].rank === values.length - 1 && this.game.wildStatus === 1) {
                            wild.rank = values.length - 2;
                        } else {
                            wild.rank = values.length - 1;
                        }
                        wild.wildValue = values[wild.rank];
                        this.cards.push(wild);
                    }
                    this.cards = this.cards.concat(this.nextHighest().slice(0, this.game.cardsInHand - 5));
                    break;
                }
            }
        }

        if (this.cards.length >= 5) {
            const type = `${this.cards[0].toString().slice(0, -1)}'s over ${this.cards[3].toString().slice(0, -1)}'s`;
            this.descr = `${this.name}, ${type}`;
        }

        return this.cards.length >= 5;
    }
}

class Flush extends Hand {
    descr!: string;
    constructor (cards: any, game: any, canDisqualify: any) {
        super(cards, 'Flush', game, canDisqualify);
    }

    solve () {
        var suit;
        this.sfLength = 0;
        this.resetWildCards();

        for (suit in this.suits) {
            const cards = this.getCardsForFlush(suit, true);
            if (cards.length >= this.game.sfQualify) {
                this.cards = cards;
                break;
            }
        }

        if (this.cards.length >= this.game.sfQualify) {
            this.descr = `${this.name}, ${this.cards[0].toString().slice(0, -1)}${suit} High`;
            this.sfLength = this.cards.length;
            if (this.cards.length < this.game.cardsInHand) {
                this.cards = this.cards.concat(this.nextHighest().slice(0, this.game.cardsInHand - this.cards.length));
            }
        }

        return this.cards.length >= this.game.sfQualify;
    }
}

class Straight extends Hand {
    descr!: string;
    sfQualify: any;
    constructor (cards: any, game: any, canDisqualify?: undefined) {
        super(cards, 'Straight', game, canDisqualify);
    }

    solve () {
        let card; let checkCards;
        this.resetWildCards();

        // There are still some games that count the wheel as second highest.
        // These games do not have enough cards/wilds to make AKQJT and 5432A both possible.
        if (this.game.wheelStatus === 1) {
            this.cards = this.getWheel();
            if (this.cards.length) {
                let wildCount = 0;
                for (var i = 0; i < this.cards.length; i++) {
                    card = this.cards[i];
                    if (card.value === this.game.wildValue) {
                        wildCount += 1;
                    }
                    if (card.rank === 0) {
                        card.rank = values.indexOf('A');
                        card.wildValue = 'A';
                        if (card.value === '1') {
                            card.value = 'A';
                        }
                    }
                }
                this.cards = this.cards.sort(Card.sort);
                for (; wildCount < this.wilds.length && this.cards.length < this.game.cardsInHand; wildCount++) {
                    card = this.wilds[wildCount];
                    card.rank = values.indexOf('A');
                    card.wildValue = 'A';
                    this.cards.push(card);
                }
                this.descr = `${this.name}, Wheel`;
                this.sfLength = this.sfQualify;
                if (this.cards[0].value === 'A') {
                    this.cards = this.cards.concat(this.nextHighest().slice(1, this.game.cardsInHand - this.cards.length + 1));
                } else {
                    this.cards = this.cards.concat(this.nextHighest().slice(0, this.game.cardsInHand - this.cards.length));
                }
                return true;
            }
            this.resetWildCards();
        }

        this.cards = this.getGaps();

        // Now add the wild cards, if any, and set the appropriate ranks
        for (var i = 0; i < this.wilds.length; i++) {
            card = this.wilds[i];
            checkCards = this.getGaps(this.cards.length);
            if (this.cards.length === checkCards.length) {
                // This is an "open-ended" straight, the high rank is the highest possible rank.
                if (this.cards[0].rank < (values.length - 1)) {
                    card.rank = this.cards[0].rank + 1;
                    card.wildValue = values[card.rank];
                    this.cards.push(card);
                } else {
                    card.rank = this.cards[this.cards.length - 1].rank - 1;
                    card.wildValue = values[card.rank];
                    this.cards.push(card);
                }
            } else {
                // This is an "inside" straight, the high card doesn't change.
                for (let j = 1; j < this.cards.length; j++) {
                    if (this.cards[j - 1].rank - this.cards[j].rank > 1) {
                        card.rank = this.cards[j - 1].rank - 1;
                        card.wildValue = values[card.rank];
                        this.cards.push(card);
                        break;
                    }
                }
            }
            this.cards = this.cards.sort(Card.sort);
        }
        if (this.cards.length >= this.game.sfQualify) {
            this.descr = `${this.name}, ${this.cards[0].toString().slice(0, -1)} High`;
            this.cards = this.cards.slice(0, this.game.cardsInHand);
            this.sfLength = this.cards.length;
            if (this.cards.length < this.game.cardsInHand) {
                if (this.cards[this.sfLength - 1].rank === 0) {
                    this.cards = this.cards.concat(this.nextHighest().slice(1, this.game.cardsInHand - this.cards.length + 1));
                } else {
                    this.cards = this.cards.concat(this.nextHighest().slice(0, this.game.cardsInHand - this.cards.length));
                }
            }
        }

        return this.cards.length >= this.game.sfQualify;
    }

    /**
     * Get the number of gaps in the straight.
     * @return {Array} Highest potential straight with fewest number of gaps.
     */
    getGaps (checkHandLength?: number) {
        let wildCards; let cardsToCheck; let i; let card; let gapCards; let cardsList; let gapCount; let prevCard; let diff;

        const stripReturn = Hand.stripWilds(this.cardPool);
        wildCards = stripReturn[0];
        cardsToCheck = stripReturn[1];

        for (i = 0; i < cardsToCheck.length; i++) {
            card = cardsToCheck[i];
            if (card.wildValue === 'A') {
                cardsToCheck.push(new Card(`1${card.suit}`));
            }
        }
        cardsToCheck = cardsToCheck.sort(Card.sort);

        if (checkHandLength) {
            i = cardsToCheck[0].rank + 1;
        } else {
            checkHandLength = this.game.sfQualify;
            i = values.length;
        }

        gapCards = [];
        for (; i > 0; i--) {
            cardsList = [];
            gapCount = 0;
            for (let j = 0; j < cardsToCheck.length; j++) {
                card = cardsToCheck[j];
                if (card.rank > i) {
                    continue;
                }
                prevCard = cardsList[cardsList.length - 1];
                diff = (prevCard) ? prevCard.rank - card.rank : i - card.rank;

                if (diff === null) {
                    cardsList.push(card);
                } else if ((checkHandLength as number) < (gapCount + diff + cardsList.length)) {
                    break;
                } else if (diff > 0) {
                    cardsList.push(card);
                    gapCount += (diff - 1);
                }
            }
            if (cardsList.length > gapCards.length) {
                gapCards = cardsList.slice();
            }
            if (this.game.sfQualify - gapCards.length <= wildCards.length) {
                break;
            }
        }

        return gapCards;
    }

    getWheel () {
        let wildCards; let cardsToCheck; let i; let card; let wheelCards; let wildCount; let cardFound;

        const stripReturn = Hand.stripWilds(this.cardPool);
        wildCards = stripReturn[0];
        cardsToCheck = stripReturn[1];

        for (i = 0; i < cardsToCheck.length; i++) {
            card = cardsToCheck[i];
            if (card.wildValue === 'A') {
                cardsToCheck.push(new Card(`1${card.suit}`));
            }
        }
        cardsToCheck = cardsToCheck.sort(Card.sort);

        wheelCards = [];
        wildCount = 0;
        for (i = this.game.sfQualify - 1; i >= 0; i--) {
            cardFound = false;
            for (let j = 0; j < cardsToCheck.length; j++) {
                card = cardsToCheck[j];
                if (card.rank > i) {
                    continue;
                }
                if (card.rank < i) {
                    break;
                }
                wheelCards.push(card);
                cardFound = true;
                break;
            }
            if (!cardFound) {
                if (wildCount < wildCards.length) {
                    wildCards[wildCount].rank = i;
                    wildCards[wildCount].wildValue = values[i];
                    wheelCards.push(wildCards[wildCount]);
                    wildCount += 1;
                } else {
                    return [];
                }
            }
        }

        return wheelCards;
    }
}

class ThreeOfAKind extends Hand {
    descr!: string;
    constructor (cards: any, game: any, canDisqualify: any) {
        super(cards, 'Three of a Kind', game, canDisqualify);
    }

    solve () {
        this.resetWildCards();

        for (let i = 0; i < this.values.length; i++) {
            if (this.getNumCardsByRank(i) === 3) {
                this.cards = this.values[i] || [];
                for (let j = 0; j < this.wilds.length && this.cards.length < 3; j++) {
                    const wild = this.wilds[j];
                    if (this.cards) {
                        wild.rank = this.cards[0].rank;
                    } else {
                        wild.rank = values.length - 1;
                    }
                    wild.wildValue = values[wild.rank];
                    this.cards.push(wild);
                }
                this.cards = this.cards.concat(this.nextHighest().slice(0, this.game.cardsInHand - 3));
                break;
            }
        }

        if (this.cards.length >= 3) {
            if (this.game.noKickers) {
                this.cards.length = 3;
            }

            this.descr = `${this.name}, ${this.cards[0].toString().slice(0, -1)}'s`;
        }

        return this.cards.length >= 3;
    }
}

class TwoPair extends Hand {
    descr!: string;
    constructor (cards: any, game: any, canDisqualify: any) {
        super(cards, 'Two Pair', game, canDisqualify);
    }

    solve () {
        this.resetWildCards();

        for (let i = 0; i < this.values.length; i++) {
            const cards = this.values[i];
            if (this.cards.length > 0 && this.getNumCardsByRank(i) === 2) {
                this.cards = this.cards.concat(cards || []);
                for (var j = 0; j < this.wilds.length; j++) {
                    var wild = this.wilds[j];
                    if (wild.rank !== -1) {
                        continue;
                    }
                    if (cards) {
                        wild.rank = cards[0].rank;
                    } else if (this.cards[0].rank === values.length - 1 && this.game.wildStatus === 1) {
                        wild.rank = values.length - 2;
                    } else {
                        wild.rank = values.length - 1;
                    }
                    wild.wildValue = values[wild.rank];
                    this.cards.push(wild);
                }
                this.cards = this.cards.concat(this.nextHighest().slice(0, this.game.cardsInHand - 4));
                break;
            } else if (this.getNumCardsByRank(i) === 2) {
                this.cards = this.cards.concat(cards);
                for (var j = 0; j < this.wilds.length; j++) {
                    var wild = this.wilds[j];
                    if (wild.rank !== -1) {
                        continue;
                    }
                    if (cards) {
                        wild.rank = cards[0].rank;
                    } else if (this.cards[0].rank === values.length - 1 && this.game.wildStatus === 1) {
                        wild.rank = values.length - 2;
                    } else {
                        wild.rank = values.length - 1;
                    }
                    wild.wildValue = values[wild.rank];
                    this.cards.push(wild);
                }
            }
        }

        if (this.cards.length >= 4) {
            if (this.game.noKickers) {
                this.cards.length = 4;
            }

            const type = `${this.cards[0].toString().slice(0, -1)}'s & ${this.cards[2].toString().slice(0, -1)}'s`;
            this.descr = `${this.name}, ${type}`;
        }

        return this.cards.length >= 4;
    }
}

class OnePair extends Hand {
    descr!: string;
    constructor (cards: any, game: any, canDisqualify: any) {
        super(cards, 'Pair', game, canDisqualify);
    }

    solve () {
        this.resetWildCards();

        for (let i = 0; i < this.values.length; i++) {
            if (this.getNumCardsByRank(i) === 2) {
                this.cards = this.cards.concat(this.values[i] || []);
                for (let j = 0; j < this.wilds.length && this.cards.length < 2; j++) {
                    const wild = this.wilds[j];
                    if (this.cards) {
                        wild.rank = this.cards[0].rank;
                    } else {
                        wild.rank = values.length - 1;
                    }
                    wild.wildValue = values[wild.rank];
                    this.cards.push(wild);
                }
                this.cards = this.cards.concat(this.nextHighest().slice(0, this.game.cardsInHand - 2));
                break;
            }
        }

        if (this.cards.length >= 2) {
            if (this.game.noKickers) {
                this.cards.length = 2;
            }

            this.descr = `${this.name}, ${this.cards[0].toString().slice(0, -1)}'s`;
        }

        return this.cards.length >= 2;
    }
}

class HighCard extends Hand {
    descr!: string;
    constructor (cards: any, game: any, canDisqualify: any) {
        super(cards, 'High Card', game, canDisqualify);
    }

    solve () {
        this.cards = this.cardPool.slice(0, this.game.cardsInHand);

        for (let i = 0; i < this.cards.length; i++) {
            if (this.cards[i].value === this.game.wildValue) {
                this.cards[i].wildValue = 'A';
                this.cards[i].rank = values.indexOf('A');
            }
        }

        if (this.game.noKickers) {
            this.cards.length = 1;
        }

        this.cards = this.cards.sort(Card.sort);
        this.descr = `${this.cards[0].toString().slice(0, -1)} High`;

        return true;
    }
}

const gameRules: { [key: string]: any } = {
    standard: {
        cardsInHand: 5,
        handValues: [StraightFlush, FourOfAKind, FullHouse, Flush, Straight, ThreeOfAKind, TwoPair, OnePair, HighCard],
        wildValue: null,
        wildStatus: 1,
        wheelStatus: 0,
        sfQualify: 5,
        lowestQualified: null,
        noKickers: false,
    },
    shortCardsStandard: {
        cardsInHand: 5,
        handValues: [StraightFlush, FourOfAKind, Flush, FullHouse, Straight, ThreeOfAKind, TwoPair, OnePair, HighCard],
        wildValue: null,
        wildStatus: 1,
        wheelStatus: 0,
        sfQualify: 5,
        lowestQualified: null,
        noKickers: false,
    },
    jacksbetter: {
        cardsInHand: 5,
        handValues: [StraightFlush, FourOfAKind, FullHouse, Flush, Straight, ThreeOfAKind, TwoPair, OnePair, HighCard],
        wildValue: null,
        wildStatus: 1,
        wheelStatus: 0,
        sfQualify: 5,
        lowestQualified: ['Jc', 'Jd', '4h', '3s', '2c'],
        noKickers: true,
    },
    joker: {
        cardsInHand: 5,
        handValues: [NaturalRoyalFlush, FiveOfAKind, WildRoyalFlush, StraightFlush, FourOfAKind, FullHouse, Flush, Straight, ThreeOfAKind, TwoPair, HighCard],
        wildValue: 'O',
        wildStatus: 1,
        wheelStatus: 0,
        sfQualify: 5,
        lowestQualified: ['4c', '3d', '3h', '2s', '2c'],
        noKickers: true,
    },
};

/**
   * Base Game class that defines the rules of the game.
   */
class Game {
    descr: any;
    cardsInHand: number;
    handValues: never[];
    wildValue: null;
    wildStatus: number;
    wheelStatus: number;
    sfQualify: number;
    lowestQualified: null;
    noKickers: null;
    constructor (descr: string) {
        this.descr = descr;
        this.cardsInHand = 0;
        this.handValues = [];
        this.wildValue = null;
        this.wildStatus = 0;
        this.wheelStatus = 0;
        this.sfQualify = 5;
        this.lowestQualified = null;
        this.noKickers = null;

        // Set values based on the game rules.
        if (!this.descr || !gameRules[this.descr]) {
            this.descr = 'standard';
        }
        this.cardsInHand = gameRules[this.descr].cardsInHand;
        this.handValues = gameRules[this.descr].handValues;
        this.wildValue = gameRules[this.descr].wildValue;
        this.wildStatus = gameRules[this.descr].wildStatus;
        this.wheelStatus = gameRules[this.descr].wheelStatus;
        this.sfQualify = gameRules[this.descr].sfQualify;
        this.lowestQualified = gameRules[this.descr].lowestQualified;
        this.noKickers = gameRules[this.descr].noKickers;
    }
}

export default Hand;