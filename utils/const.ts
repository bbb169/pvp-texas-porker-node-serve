import { readFileSync, writeFile } from 'fs';
import path from 'path';

/** private ket to encript message, this is just a demo */
export const privateKey = 'secret key';

const filePath = 'gptPorkerPrompt.txt'; // customable
const filePromptContent = readFileSync(path.join(__dirname, filePath), 'utf8');
export const addCaseToGptPrompt = (str: string) => {
    return new Promise((resolve, reject) => {
        writeFile(filePath, filePromptContent + str, 'utf8', (err) => {
            if (err) {
                reject(err);
                return;
            }
            resolve('文件写入成功！');
        });
    });
};

export const getGptPrompt = (message: string) => `
Background
Now you are performing a service for the players of a Texas Hold'em poker game, you will know the current number of players, the suit and size of the cards of the players already have, and the suit and size of the cards already shown in the public cards, the current rules of the game whether it is a long hand or a short hand (a short Texas is a pile of cards without a 2345), and you will have to derive the user's win rate based on this already known information about the cards, the maximum possible hand that can be formed by the public cards (pick five cards in public cards and any other two cards), and the maximum possible hand that the user can form(pick five cards in public cards and user's cards), and return it. 

Input Format
JSON object with the following TS type:
{
  publicCards: string[];
  userCards: string[];
  playersCount: number;
  isShortCards: boolean;
}
In the above types, publicCards represents the suit and size of the cards that have been displayed in the public deck, with a maximum of five cards displayed, userCards represents the suit and size of the user's public cards, with a holding of two cards, and they are an array consisting of strings, which is a string of length 2 consisting of strict rules, the first bit of which represents the size of the cards, which must be 1-9, T,A,J,Q,K where the characters, T represents the number 10, and the second bit of which is the suit of the cards, which is h for hearts, d for diamonds, c for clubs, and s for spades, e.g., As for the Ace of Spades and Th for the Ten of Hearts.

The output is in the form of a json object, which should be of the following form:
 {"winRate": number,"publcHighestCards": string[],"userHighestCards": string[]}
 "winRate" represents the win rate of the player, which is returned as a number, the maximum is 100 and the minimum is 0. "publcHighestCards" represents the largest possible hand formed by the public cards, and "userHighestCards" represents the largest possible hand formed by the user, which is formed by an array of strings, and the format of the strings should be the same as that of the input strings, e.g. As represents the Ace of Spades, Th represents the Ten of Hearts.

 Example
    My input:
    {
      "publicCards": ["Js", "Qs", "8s"],
      "userCards": ["6s", "8h"],
      "playersCount": 5,
      "isShortCards": true
    }
    Your output:
    {"winRate": 60,"publcHighestCards": ['Ts','Js','Qs','Ks','As'],"userHighestCards": ['Ks','8c','8d','8s','8h']}
    Explanation: Since the user's card is one spade short of a flush and has a pair of eights, so the winning percentage is already good, for 60, the public cards are spades K,Q,8, the possible composition of the largest card type for the flush of spades A,K,Q,J,10; the user holds the cards for the six of spades and the eight of hearts, at this time the user is still unknown for the public cards of the remaining two unopened cards, so he has only two free pre-set cards, The maximum hand he can make is the four of 8 and the Q of spades in the public hand.
    My input:
    {
      "publicCards": ["6s", "8d", "8s"],
      "userCards": ["Ks", "8h"],
      "playersCount": 3,
      "isShortCards": true
    }
    Your output:
    {"winRate": 80,"publcHighestCards": ['As','6s','7s','8s','9s'],"userHighestCards": ['As','8c','8d','8s','8h']}
    Explanation: Since the user's cards have already become three of a kind, the deck is unlikely to become a flush, so the win rate is already high, the public cards are the 6, 8 of spades and the 8 of diamonds, the possible cards that could constitute the largest single hand are the Ace of spades, 6,7,8,9 of a flush, because there are still four cards that can be freely pre-set, there are still two cards in the public deck that have not been opened, and there are still two cards that come from the holdings of other player; and the user can only be free to pre-set for the time being Two cards, one constitutes the four 8s, one constitutes the largest single card, As
    My input:
    {
      "publicCards": ["6s", "6d", "6h"],
      "userCards": ["Ks", "8h"],
      "playersCount": 3,
      "isShortCards": true
    }
    Your output:
    {"winRate": 10,"publcHighestCards": ['As','6s','7s','8s','9s'],"userHighestCards": ['6c','6d','6h','6s','As']}
    My input:
    {
      "publicCards": ["6s", "6d", "8h"],
      "userCards": ["Ks", "6h"],
      "playersCount": 3,
      "isShortCards": true
    }
    Your output:
    {"winRate": 80,"publcHighestCards": ['8h','9h','Th','Jh','Qh'],"userHighestCards": ['6c','6d','6h','6s','As']}
    ${filePromptContent}

Requirements
  1. Please check the input format, strings that do not meet the inputformat are handled as error cases, and only answer "error" for errorcases;
  2. Please follow the output format strictly;

Tasks
  Please follow the above content and requirements strictly to answer accordingly to my input, please only answer according to the output format, and reject other descriptive text.

At last
  follow my input, give your answer:
  My input:
  ${message}
  Your output:
`;