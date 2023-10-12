import { OpenAI } from 'openai';  
import { OPENAI_API_KEY } from './chatgptApiKey';
import { gptPrompt } from './const';

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });  

const getGptResponse = async (message: string) => {
    const response = await openai.completions.create({
        model: 'gpt-3.5-turbo',
        prompt: gptPrompt(message),
    });
};

