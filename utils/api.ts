import { OpenAI } from 'openai';  
import { OPENAI_API_KEY } from './chatgptApiKey';
import { getGptPrompt } from './const';
interface GptPromptMessage {
    publicCards: string[];
    userCards: string[];
    playersCount: number;
    isShortCards: boolean;
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });  

export const getGptResponse = async (message: GptPromptMessage) => {
    const response = await openai.completions.create({
        model: 'gpt-3.5-turbo',
        prompt: getGptPrompt(JSON.stringify(message)),
    });

    return response.choices;
};

