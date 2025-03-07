import { Module } from '@nestjs/common';
import { RoomModule } from '../room/room.module';
// import { GptPredictModule } from '../gpt-predict/gpt-predict.module';
import { RoomGateway } from './events/room.gateway';
import { RoomSocketService } from '../../services/room-socket.service';

/**
 * WebSocketModule provides websocket functionality for the application
 * It integrates with RoomModule and GptPredictModule to provide real-time
 * game updates and AI predictions
 */
@Module({
    imports: [
        RoomModule,
        // GptPredictModule,
    ],
    providers: [
        RoomGateway,
        RoomSocketService,
    ],
    exports: [
        RoomGateway,
        RoomSocketService,
    ],
})
export class WebSocketModule {}