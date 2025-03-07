import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { RoomModule } from '../room/room.module';

/**
 * ApiModule aggregates and organizes all API endpoints
 * 
 * This module serves as a centralized location for all API controllers
 * and sets up a common '/api' prefix for all routes
 */
@Module({
    imports: [
    // Import modules containing controllers
        RoomModule,
        // GptPredictModule,
    
        // Configure route prefixes
        RouterModule.register([
            {
                path: 'api',
                module: RoomModule,
            },
            // {
            //     path: 'api',
            //     module: GptPredictModule,
            // },
        ]),
    ],
    controllers: [],
    providers: [],
    exports: [],
})
export class ApiModule {}