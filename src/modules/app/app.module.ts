import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { RoomModule } from '../room/room.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { GptPredictModule } from '../gpt-predict/gpt-predict.module';

/**
 * AppModule is the root module of the application
 * 
 * It imports all necessary modules for the application to function:
 * - ConfigModule: For environment configuration
 * - ServeStaticModule: For serving static files
 * - RoomModule: For room management functionality
 * - WebSocketModule: For real-time communication
 * - GptPredictModule: For AI prediction capabilities
 */
@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),
        ServeStaticModule.forRoot({
            rootPath: join(__dirname, '../..', 'public'),
            exclude: ['/api*'],
        }),
        RoomModule,
        WebSocketModule,
        GptPredictModule,
    ],
    controllers: [AppController],
    providers: [],
})
export class AppModule {}