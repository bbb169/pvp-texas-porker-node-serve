import { Module } from '@nestjs/common';
import { RoomController } from './controllers/room.controller';
import { RoomService } from './services/room.service';
import { PlayerService } from './services/player.service';
import { GameService } from './services/game.service';

@Module({
    imports: [],
    controllers: [RoomController],
    providers: [RoomService, PlayerService, GameService],
    exports: [RoomService, PlayerService, GameService],
})
export class RoomModule {}