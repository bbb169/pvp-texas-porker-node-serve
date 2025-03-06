import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { PlayerInfoType } from '../../types/roomInfo';
import { RoomService } from '../../modules/room/services/room.service';
import { PlayerService } from '../../modules/room/services/player.service';

export type RoomSocketMapType = Map<string, Map<string, Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>>>;

@Injectable()
export class RoomSocketService {
  private readonly roomMap: RoomSocketMapType = new Map();

  constructor(
    private readonly roomService: RoomService,
    private readonly playerService: PlayerService,
  ) {}

  /**
   * Add a socket connection to a room for a specific user
   * @param roomId - The ID of the room to add the socket to
   * @param userName - The username of the player
   * @param socket - The socket connection
   * @returns [roomId, userName] - Updated roomId and userName (may have changed if username was taken)
   */
  addRoomSocket(roomId: string, userName: string, socket: Socket): [string, string] {
    const room = this.roomService.getRoomInfo(roomId);
    const player = room?.players.get(userName);

    // Check if room is in progress and handle connection accordingly
    if (room && room.statu !== 'waiting') {
      if (player && !player.status.includes('disconnect')) {
        socket.emit('refuseConnect', 'player has existed, please check username');
        return [] as unknown as [string, string];
      }
      if (!player) {
        socket.emit('refuseConnect', 'this room has started, please go for another room');
        return [] as unknown as [string, string];
      }
    }

    // Handle socket connection
    const socketMap = this.roomMap.get(roomId)?.get(userName);

    // Handle reconnection
    if (room && player?.status.includes('disconnect')) {
      // Add socket back
      this.roomMap.get(roomId)?.set(userName, socket);
      room.players.set(userName, {
        ...player,
        status: ['waiting'],
      });
    } else if (!socketMap) {
      // Handle new connection
      const userMap = this.roomMap.get(roomId);
      if (userMap) {
        userMap.set(userName, socket);
      } else {
        this.roomMap.set(roomId, new Map().set(userName, socket));
      }
    } else {
      // Handle username collision
      let tempUserName = userName;
      while (this.roomMap.get(roomId)?.get(tempUserName)) {
        tempUserName += '-1';
      }
      userName = tempUserName;
      this.roomMap.get(roomId)?.set(userName, socket);
    }

    socket.emit('updateUserName', userName);

    return [roomId, userName];
  }

  /**
   * Remove a socket connection from a room
   * @param roomId - The ID of the room
   * @param userName - The username of the player (optional - if not provided, the entire room will be removed)
   */
  deleteRoomSocket(roomId: string, userName?: string): void {
    const room = this.roomMap.get(roomId);

    if (!room) return;

    if (userName) {
      room.delete(userName);
    } else {
      this.roomMap.delete(roomId);
    }
  }

  /**
   * Report data to all players in a room except excluded players
   * @param params - Parameters for reporting data
   */
  reportDataToAllPlayersInRoom({ 
    roomId, 
    evtKey, 
    data, 
    excludePlayerName = [] 
  }: { 
    roomId: string;
    evtKey: string; 
    data: any, 
    excludePlayerName: string[] 
  }): void {
    const room = this.roomService.getRoomInfo(roomId);

    if (room) {
      this.roomMap.get(roomId)?.forEach((socketItem, userName) => {
        if (!excludePlayerName.includes(userName)) {
          socketItem.emit(evtKey, data);
        }
      });
    }
  }

  /**
   * Report room state to all players in a room
   * @param roomId - The ID of the room
   * @param callback - Optional callback to be executed for each player
   */
  reportToAllPlayersInRoom(
    roomId: string, 
    callback?: (socket: Socket, player: PlayerInfoType) => void
  ): void {
    const room = this.roomService.getRoomInfo(roomId);
  
    if (room) {
      const playerMap: Map<string, PlayerInfoType> = new Map();
      room.players.forEach(player => {
        playerMap.set(player.name, player);
      });

      this.roomMap.get(roomId)?.forEach((socketItem, userName) => {
        socketItem.emit('room', room);
        const myPlayer = playerMap.get(userName);

        if (!myPlayer) {
          throw new Error(`reportToAllPlayersInRoom did not find myPlayer ${userName}`);
        }
        
        const allPlayers = Array.from(room.players.values());
        const myPlayerIndex = myPlayer.position;
        allPlayers.splice(myPlayerIndex, 1);

        socketItem.emit('user', {
          myPlayer,
          otherPlayers: allPlayers,
        });

        if (callback) {
          callback(socketItem, myPlayer);
        }
      });
    }
  }

  /**
   * Get all room sockets
   * @returns The map of all room sockets
   */
  getRoomSockets(): RoomSocketMapType {
    return this.roomMap;
  }

  /**
   * Get socket for a specific player in a room
   * @param roomId - The ID of the room
   * @param userName - The username of the player
   * @returns The socket connection for the player, or undefined if not found
   */
  getPlayerSocket(roomId: string, userName: string): Socket | undefined {
    return this.roomMap.get(roomId)?.get(userName);
  }

  /**
   * Check if a room has any active sockets
   * @param roomId - The ID of the room
   * @returns True if the room has active sockets, false otherwise
   */
  hasActiveSockets(roomId: string): boolean {
    return !!this.roomMap.get(roomId)?.size;
  }
}