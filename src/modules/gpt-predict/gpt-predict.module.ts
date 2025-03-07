import { Module } from '@nestjs/common';
import { GptPredictService } from './services/gpt-predict.service';

/**
 * GptPredictModule provides AI prediction capabilities for poker games
 * This module integrates OpenAI's GPT to predict poker outcomes and player strategies
 */
@Module({
    imports: [],
    providers: [GptPredictService],
    exports: [GptPredictService],
})
export class GptPredictModule {}