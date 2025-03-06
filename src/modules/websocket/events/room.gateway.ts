import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { RoomService } from '../../room/services/room.service';
import { PlayerService } from '../../room/services/player.service';
import { GameService } from '../../room/services/game.service';
import { ChatMessageType, PlayerInfoType, PlayerCallChipsRes } from '../../../types/roomInfo';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';

type RoomSocketMapType = Map<string, Map<string, Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>>>;

@Injectable()
@WebSocketGateway({
  cors: {
    origin: `http://${process.env.NODE_ENV === 'production' ? '152.136.254.142' : 'localhost'}:4000`,
    methods: ['GET', 'POST'],
    allowedHeaders: ['my-custom-header'],
  },
})
export class RoomGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly roomMap: RoomSocketMapType = new Map();
  private readonly heartbeatInterval: NodeJS.Timeout;

  constructor(
    private readonly roomService: RoomService,
    private readonly playerService: PlayerService,
    private readonly gameService: GameService,
  ) {
    this.heartbeatInterval = setInterval(() => this.checkHeartbeats(), 10000);
  }

  afterInit(server: Server) {
    console.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    // Handle specific disconnect logic in the connectRoom handler
  }

  private addRoomSocket(roomId: string, userName: string, socket: Socket): [string, string] {
    const room = this.roomService.getRoomInfo(roomId);
    const player = room?.players.get(userName);

    if (room && room.statu !== 'waiting') {
      if (player && !player.status.includes('disconnect')) {
        socket.emit('refuseConnect', 'player has existed, please check username');
        return [roomId, userName];
      }
      if (!player) {
        socket.emit('refuseConnect', 'this room has started, please go for another room');
        return [roomId, userName];
      }
    }

    // Handle socket collection
    const socketMap = this.roomMap.get(roomId)?.get(userName);

    // Handle reconnection
    if (room && player?.status.includes('disconnect')) {
      this.roomMap.get(roomId)?.set(userName, socket);
      room.players.set(userName, {
        ...player,
        status: ['waiting'],
      });
    } else if (!socketMap) {
      const userMap = this.roomMap.get(roomId);
      if (userMap) {
        userMap.set(userName, socket);
      } else {
        this.roomMap.set(roomId, new Map().set(userName, socket));
      }
    } else {
      let newUserName = userName;
      while (this.roomMap.get(roomId)?.get(newUserName)) {
        newUserName += '-1';
      }
      userName = newUserName;
      this.roomMap.get(roomId)?.set(userName, socket);
    }

    socket.emit('updateUserName', userName);
    return [roomId, userName];
  }

  private deleteRoomSocket(roomId: string, userName?: string) {
    const room = this.roomMap.get(roomId);
    if (!room) return;

    if (userName) {
      room.delete(userName);
    } else {
      this.roomMap.delete(roomId);
    }
  }

  private reportDataToAllPlayersInRoom({ 
    roomId, 
    evtKey, 
    data, 
    excludePlayerName = [] 
  }: { 
    roomId: string; 
    evtKey: string; 
    data: any; 
    excludePlayerName: string[] 
  }) {
    const room = this.roomService.getRoomInfo(roomId);

    if (room) {
      this.roomMap.get(roomId)?.forEach((socketItem, userName) => {
        if (!excludePlayerName.includes(userName)) {
          socketItem.emit(evtKey, data);
        }
      });
    }
  }

  private reportToAllPlayersInRoom(
    roomId: string, 
    callback?: (socket: Socket, player: PlayerInfoType) => void
  ) {
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
          console.error(`reportToAllPlayersInRoom did not find myPlayer ${userName}`);
          return;
        }
        
        const allPlayers = Array.from(room.players.values());
        const playerIndex = allPlayers.findIndex(p => p.name === myPlayer.name);
        if (playerIndex !== -1) {
          allPlayers.splice(playerIndex, 1);
        }

        socketItem.emit('user', {
          myPlayer,
          otherPlayers: allPlayers,
        });

        callback && callback(socketItem, myPlayer);
      });
    }
  }

  private async deletePlayer(roomId: string, userName: string) {
    const isValidRoom = await this.handlePlayerDisconnect(roomId, userName);
    
    if (!isValidRoom) {
      this.roomService.deleteRoom(roomId);
      this.deleteRoomSocket(roomId);
    } else {
      this.deleteRoomSocket(roomId, userName);
    }
    
    this.reportToAllPlayersInRoom(roomId);
  }

  private async handlePlayerDisconnect(roomId: string, userName: string): Promise<number> {
    const room = this.roomService.getRoomInfo(roomId);

    if (!room) return 0;
    
    const disconnectPlayer = room.players.get(userName);

    if (disconnectPlayer) {
      if (room.statu === 'waiting') {
        this.playerService.removePlayerFromRoom(roomId, userName);
      } else {
        if (disconnectPlayer?.status.includes('calling')) {
          await this.gameService.playerCallChips(roomId, userName);
        }

        disconnectPlayer.status = disconnectPlayer.status.includes('fold') 
          ? ['fold', 'disconnect'] 
          : ['disconnect'];
      }

      // Check if room is empty
      let roomValidPlayerNum = room.players.size;
      room.players.forEach(player => {
        if (player.status.includes('disconnect')) {
          roomValidPlayerNum--;
        }
      });

      return roomValidPlayerNum;
    }

    return 0;
  }

  private checkHeartbeats() {
    this.roomMap.forEach((_socketMap, roomId) => {
      const room = this.roomService.getRoomInfo(roomId);
      const currentTime = new Date().getSeconds();

      room?.players.forEach((player, username) => {
        if (currentTime - player.activeTime > 15) {
          this.deletePlayer(roomId, username);
          console.log('heartbeat-ack err', username, this.roomMap.size);
        }
      });
    });
  }

  @SubscribeMessage('connectRoom')
  handleConnectRoom(client: Socket, payload: { roomId: string; userName: string }) {
    const { roomId, userName } = payload;
    let room = this.roomService.getRoomInfo(roomId);
    
    // Add socket and update username
    const [updatedRoomId, updatedUserName] = this.addRoomSocket(roomId, userName, client);
    
    // Create room and add player if needed
    room = this.roomService.getRoomInfo(updatedRoomId);

    if (!room?.players.has(updatedUserName)) {
      if (room) {
        const player = this.playerService.createPlayer(updatedUserName, updatedRoomId);
        this.playerService.addPlayerToRoom(updatedRoomId, player);
      } else {
        const player = this.playerService.createPlayer(updatedUserName);
        this.roomService.createRoom(player, updatedRoomId);
      }
    }
    
    // Report to all players in the room
    this.reportToAllPlayersInRoom(updatedRoomId);

    // Set up event listeners for this client
    this.setupClientEventListeners(client, updatedRoomId, updatedUserName);
  }

  private setupClientEventListeners(client: Socket, roomId: string, userName: string) {
    client.on('disconnect', () => {
      this.deletePlayer(roomId, userName);
    });

    client.on('heartDetect', () => {
      this.playerService.updatePlayerActiveTime(roomId, userName);
    });
  }

  @SubscribeMessage('startGame')
  async handleStartGame(client: Socket, isShortCard: boolean = false) {
    // Extract roomId from client connection
    const roomId = this.findRoomIdBySocket(client);
    if (!roomId) return;
    
    const room = this.roomService.getRoomInfo(roomId);
    if (room) {
      room.isShortCards = isShortCard;
      await this.gameService.startGame(roomId, isShortCard);
      this.reportToAllPlayersInRoom(roomId);
    }
  }

  @SubscribeMessage('callChips')
  async handleCallChips(client: Socket, callChips?: number) {
    const [roomId, userName] = this.findRoomAndUserBySocket(client);
    if (!roomId || !userName) return;

    const result: PlayerCallChipsRes = await this.gameService.playerCallChips(roomId, userName, callChips);
    
    this.reportToAllPlayersInRoom(roomId, (socket) => {
      if (result.victoryPlayers) {
        socket.emit('victoryPlayers', result.victoryPlayers);
      }
      if (result.playersCalledRes) {
        socket.emit('playersCalledRes', result.playersCalledRes);
      }
      // GPT prediction can be added here if needed
    });
  }

  @SubscribeMessage('turnToNextGame')
  async handleTurnToNextGame(client: Socket) {
    const roomId = this.findRoomIdBySocket(client);
    if (!roomId) return;

    await this.gameService.startGame(roomId);
    this.reportToAllPlayersInRoom(roomId);
  }

  @SubscribeMessage('clientSendAudioBlob')
  handleClientSendAudioBlob(client: Socket, blob: any) {
    const [roomId, userName] = this.findRoomAndUserBySocket(client);
    if (!roomId || !userName) return;

    this.reportDataToAllPlayersInRoom({
      roomId, 
      excludePlayerName: [userName], 
      data: { 
        userName,
        blob,
      },
      evtKey: 'serverSendAudioBlob',
    });
  }

  @SubscribeMessage('sendMessage')
  handleSendMessage(client: Socket, msg: Omit<ChatMessageType, 'key'>) {
    const roomId = this.findRoomIdBySocket(client);
    if (!roomId) return;

    this.reportDataToAllPlayersInRoom({
      roomId, 
      excludePlayerName: [], 
      data: msg,
      evtKey: 'receiveMessage',
    });
  }

  @SubscribeMessage('sendEmoji')
  handleSendEmoji(client: Socket, msg: any) {
    const roomId = this.findRoomIdBySocket(client);
    if (!roomId) return;

    this.reportDataToAllPlayersInRoom({
      roomId, 
      excludePlayerName: [], 
      data: msg,
      evtKey: 'receiveEmoji',
    });
  }

  // Helper method to find roomId by socket
  private findRoomIdBySocket(socket: Socket): string | null {
    for (const [roomId, userMap] of this.roomMap.entries()) {
      for (const [_, clientSocket] of userMap.entries()) {
        if (clientSocket.id === socket.id) {
          return roomId;
        }
      }
    }
    return null;
  }

  // Helper method to find both roomId and userName by socket
  private findRoomAndUserBySocket(socket: Socket): [string | null, string | null] {
    for (const [roomId, userMap] of this.roomMap.entries()) {
      for (const [userName, clientSocket] of userMap.entries()) {
        if (clientSocket.id === socket.id) {
          return [roomId, userName];
        }
      }
    }
    return [null, null];
  }

  // Clean up on module destruction
  onModuleDestroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
  }
}