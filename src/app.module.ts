import { Module, MiddlewareConsumer, RequestMethod, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppModule as ApplicationModule } from './modules/app/app.module';
import { RoomModule } from './modules/room/room.module';
import { WebSocketModule } from './modules/websocket/websocket.module';
// import { GptPredictModule } from './modules/gpt-predict/gpt-predict.module';
import { ApiModule } from './modules/api/api.module';
import { LoggerMiddleware } from './app/middleware/logger.middleware';
import { RoomSocketService } from './services/room-socket.service';
import { CardsService } from './services/cards.service';

/**
 * Root application module
 * 
 * This is the main module that bootstraps the entire application.
 * It imports all required modules and sets up global configurations and middleware.
 */
@Module({
    imports: [
    // Load environment variables
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),
    
        // Serve static files
        ServeStaticModule.forRoot({
            rootPath: join(__dirname, '..', 'public'),
            exclude: ['/api/*'],
        }),
    
        // Application modules
        ApplicationModule,
        RoomModule,
        WebSocketModule,
        // GptPredictModule,
        ApiModule,
    ],
    providers: [
    // Global providers available throughout the application
        RoomSocketService,
        CardsService,
    ],
    exports: [
    // Export providers that might be needed outside this module
        RoomSocketService,
        CardsService,
    ],
})
export class AppModule implements NestModule {
    /**
   * Configure global middleware
   * 
   * Sets up middleware that applies to all routes
   */
    configure (consumer: MiddlewareConsumer) {
        consumer
            .apply(LoggerMiddleware)
            .forRoutes({ path: '*', method: RequestMethod.ALL });
    }
}