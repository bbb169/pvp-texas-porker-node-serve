import { Injectable } from '@nestjs/common';
import { PlayerInfoType, RoomInfo, VictoryInfo, PlayerCallChipsRes } from '../../../types/roomInfo';
import { RoomService } from './room.service';

@Injectable()
export class PlayerService {
  constructor(private readonly roomService: RoomService) {}

  createPlayer(userName: string, roomId?: string): PlayerInfoType {
    let position = 0;

    if (roomId) {
      const room = this.roomService.getRoomInfo(roomId);
      if (room) {
        position = room.players.size;
        if (room.players.has(userName)) {
          userName = `${userName}-1`;
        }
      }
    }

    return {
      name: userName,
      position,
      status: ['waiting'],
      holdCards: [],
      holdCent: 100,
      calledChips: 0,
      blind: 0,
      debt: 0,
      roundCalled: false,
      activeTime: new Date().getSeconds(),
    };
  }

  addPlayerToRoom(roomId: string, player: PlayerInfoType): void {
    const room = this.roomService.getRoomInfo(roomId);
    if (room && !room.players.has(player.name)) {
      room.players.set(player.name, player);
    }
  }

  removePlayerFromRoom(roomId: string, userName: string): void {
    const room = this.roomService.getRoomInfo(roomId);

    if (room && room.players.has(userName)) {
      let playerIndex = -1;
      let isButtonPlayer = false;

      room.players.forEach((player) => {
        if (playerIndex !== -1) {
          player.position -= 1;
        }
        if (player.name === userName) {
          playerIndex = player.position;
          isButtonPlayer = player.position === room.buttonIndex;
        }
      });
      
      if (playerIndex === -1) return;

      room.players.delete(userName);
      
      if (isButtonPlayer) {
        this.roomService.updateRoom(roomId, {
          ...room,
          buttonIndex: (room.buttonIndex + 1) % room.players.size,
        });
      }
    }
  }

  updatePlayerActiveTime(roomId: string, userName: string): void {
    const room = this.roomService.getRoomInfo(roomId);
    const player = room?.players.get(userName);

    if (player) {
      player.activeTime = new Date().getSeconds();
    }
  }

  /**
   * Handle player folding their hand
   * @param roomId - ID of the room the player is in
   * @param playerName - Name of the player folding
   * @returns Player's information after folding
   */
  playerFoldCards(roomId: string, playerName: string): PlayerInfoType | undefined {
    const room = this.roomService.getRoomInfo(roomId);
    if (!room) return undefined;

    const player = room.players.get(playerName);
    if (!player) return undefined;

    // Update player status
    player.status = ['fold'];
    player.calledChips = 0;

    // Update room's current call chips
    this.roomService.updateRoom(roomId, {
      ...room,
      currentCallChips: 0,
    });

    return player;
  }

  /**
   * Get player information by username in a specific room
   * @param roomId - ID of the room to search
   * @param playerName - Name of the player to retrieve
   * @returns Player information if found, undefined otherwise
   */
  getPlayer(roomId: string, playerName: string): PlayerInfoType | undefined {
    const room = this.roomService.getRoomInfo(roomId);
    if (!room) return undefined;

    return room.players.get(playerName);
  }
}