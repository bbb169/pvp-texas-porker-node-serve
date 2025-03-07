import { Controller, Get, Post, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { RoomService } from '../services/room.service';
import { PlayerService } from '../services/player.service';
import { GameService } from '../services/game.service';
import { CreateRoomDto } from '../dto/create-room.dto';
import { JoinRoomDto } from '../dto/join-room.dto';
import { CallChipsDto, FoldCardsDto } from '../dto/game-action.dto';
import { RoomInfo } from '../../../types/roomInfo';

/**
 * Interface representing basic room information
 */
interface RoomBasicInfoDto {
  id: string;
  name: string;
  createdBy: string;
  playerCount: number;
  isGameStarted: boolean;
}

/**
 * Interface representing room statistics
 */
interface RoomStatsDto {
  totalRooms: number;
  activeGames: number;
  waitingRooms: number;
  totalPlayers: number;
}

/**
 * Interface representing game action responses
 */
interface GameActionResponse {
  success: boolean;
  message?: string;
  roomInfo?: any;
  result?: any;
}

/**
 * Room controller handling game room operations
 */
@Controller('room')
export class RoomController {
    constructor (
    private readonly roomService: RoomService,
    private readonly playerService: PlayerService,
    private readonly gameService: GameService,
    ) {}

  /**
   * Create a new game room
   */
  @Post('create')
    createRoom (@Body() createRoomDto: CreateRoomDto): { roomId: string; roomInfo: RoomInfo } {
        const { roomId, creatorName } = createRoomDto;
    
        if (this.roomService.getRoomInfo(roomId)) {
            throw new HttpException('Room already exists', HttpStatus.CONFLICT);
        }
    
        const player = this.playerService.createPlayer(creatorName);
        const roomInfo = this.roomService.createRoom(player, roomId);
    
        return {
            roomId,
            roomInfo,
        };
    }

  /**
   * Get information about a specific room
   */
  @Get(':roomId')
  getRoomInfo (@Param('roomId') roomId: string): { roomInfo: RoomInfo } {
      const roomInfo = this.roomService.getRoomInfo(roomId);
    
      if (!roomInfo) {
          throw new HttpException('Room not found', HttpStatus.NOT_FOUND);
      }
    
      return { roomInfo };
  }

  /**
   * List all available rooms
   */
  @Get()
  listRooms (): { rooms: { id: string; playerCount: number; status: string }[], totalRooms: number } {
      const rooms = Array.from(this.roomService.getAllRooms().entries()).map(([id, room]) => ({
          id,
          playerCount: room.players.size,
          status: room.statu,
      }));
    
      return {
          rooms,
          totalRooms: rooms.length,
      };
  }

  /**
   * Join an existing room
   */
  @Post('join')
  joinRoom (@Body() joinRoomDto: JoinRoomDto): { roomId: string; roomInfo: RoomInfo } {
      const { roomId, userName } = joinRoomDto;
    
      const room = this.roomService.getRoomInfo(roomId);
      if (room) {
          if (room.players.has(userName)) {
              throw new HttpException('Username already exists in this room', HttpStatus.CONFLICT);
          }
      }
    
      const player = this.playerService.createPlayer(userName, roomId);
      this.playerService.addPlayerToRoom(roomId, player);
    
      return {
          roomId,
          roomInfo: this.roomService.getRoomInfo(roomId)!, // We already checked that it exists
      };
  }

  /**
   * Leave a room
   */
  @Post(':roomId/leave')
  leaveRoom (
    @Param('roomId') roomId: string,
    @Body('userName') userName: string,
  ): { success: boolean } {
      const room = this.roomService.getRoomInfo(roomId);
    
      if (!room) {
          throw new HttpException('Room not found. Leave failed', HttpStatus.NOT_FOUND);
      }
    
      this.playerService.removePlayerFromRoom(roomId, userName);
    
      return { success: true };
  }

  /**
   * Get statistics about rooms
   */
  @Get('stats')
  getRoomStats (): { totalRooms: number; activeGames: number; waitingRooms: number; totalPlayers: number } {
      const rooms = Array.from(this.roomService.getAllRooms().entries());
      let activeGames = 0;
      let waitingRooms = 0;
      let totalPlayers = 0;
    
      rooms.forEach(([, room]) => {
          if (room.statu === 'started') {
              activeGames++;
          } else {
              waitingRooms++;
          }
          totalPlayers += room.players.size;
      });
    
      return {
          totalRooms: rooms.length,
          activeGames,
          waitingRooms,
          totalPlayers,
      };
  }

  /**
   * Start a new game in a room
   */
  @Post(':roomId/game/start')
  startGame (@Param('roomId') roomId: string): { success: boolean; message?: string; roomInfo?: RoomInfo } {
      const room = this.roomService.getRoomInfo(roomId);
      if (!room) {
          throw new HttpException('Room not found. Start game failed', HttpStatus.NOT_FOUND);
      }

      try {
          const updatedRoomInfo = this.gameService.startGame(roomId, room.isShortCards);
          return { success: true, message: 'Game started successfully', roomInfo: updatedRoomInfo };
      } catch (error) {
          throw new HttpException('Failed to start game', HttpStatus.BAD_REQUEST);
      }
  }

  /**
   * Handle player calling chips
   */
  @Post(':roomId/game/call-chips')
  callChips (
    @Param('roomId') roomId: string,
    @Body() callChipsDto: CallChipsDto,
  ): { success: boolean; message?: string; result?: any } {
      const { userName, chips } = callChipsDto;
      const room = this.roomService.getRoomInfo(roomId);

      if (!room) {
          throw new HttpException('Room not found. Call chips failed', HttpStatus.NOT_FOUND);
      }

      try {
          const result = this.gameService.playerCallChips(roomId, userName, chips);
          return { success: true, message: 'Chips called successfully', result };
      } catch (error) {
          throw new HttpException('Failed to call chips', HttpStatus.BAD_REQUEST);
      }
  }

  /**
   * Handle player folding their hand
   */
  @Post(':roomId/game/fold')
  foldCards (
    @Param('roomId') roomId: string,
    @Body() foldCardsDto: FoldCardsDto,
  ): { success: boolean; message?: string } {
      const { userName } = foldCardsDto;
      const room = this.roomService.getRoomInfo(roomId);

      if (!room) {
          throw new HttpException('Room not found. Fold failed', HttpStatus.NOT_FOUND);
      }

      try {
          this.gameService.foldCards(roomId, userName);
          return { success: true, message: 'Cards folded successfully' };
      } catch (error) {
          throw new HttpException('Failed to fold cards', HttpStatus.BAD_REQUEST);
      }
  }

  /**
   * Proceed to next game round
   */
  @Post(':roomId/game/next')
  turnToNextGame (@Param('roomId') roomId: string): { success: boolean; message?: string } {
      const room = this.roomService.getRoomInfo(roomId);

      if (!room) {
          throw new HttpException('Room not found. Next game failed', HttpStatus.NOT_FOUND);
      }

      try {
          this.gameService.turnToNextGame(roomId);
          return { success: true, message: 'Proceeding to next game' };
      } catch (error) {
          throw new HttpException('Failed to proceed to next game', HttpStatus.BAD_REQUEST);
      }
  }
}