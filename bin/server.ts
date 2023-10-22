/**
 * 相关的模块依赖导入。
 */
import dotenv from 'dotenv';
import http from 'http';
import app from '../app';
import debug from 'debug';
import { Server as ServerIO, Socket  } from 'socket.io';
import { addPlayerForRoom, createRoom, creatPlayer, deleteRoom, getRoomInfo, updatePlayerActiveTime } from '../database/roomInfo';
import { ChatMessageType, PlayerCallChipsRes, PlayerInfoType, RoomInfo } from '../types/roomInfo';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { socketCallChips, socketDisconnect, socketStartGame, socketTurnToNextGame } from '../routes/wbSocketListeners';

/**
 * 读取环境变量配置。
 */
dotenv.config();

/**
 * 从环境变量中获取端口并存储在 Express 中。
 */
const port = normalizePort(process.env.PORT || '5000');
app.set('port', port);

/**
 * 定义创建 HTTP/HTTPS 服务器的函数：
 * 如果是生产环境，则使用 HTTPS 创建服务器，否则使用 HTTP 创建服务器。
 */
function createServer () {
    return http.createServer(app);
}
const server = createServer();

/**
 * 监听指定端口，绑定在所有网络接口上。
 */
server.listen(port, () => {
    console.log(`服务器正在监听端口 ${port}`);
});
server.on('error', onError);
server.on('listening', onListening);

/**
 * 将端口规范化为数字、字符串或 false。
 */
function normalizePort (val: any) {
    const port = parseInt(val, 10);

    if (isNaN(port)) {
    // 命名管道
        return val;
    }

    if (port >= 0) {
    // 端口号
        return port;
    }

    return false;
}

/**
 * HTTP/HTTPS 服务器 "error" 事件的事件监听器。
 */
function onError (error: any) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    const bind = typeof port === 'string' ? `管道 ${port}` : `端口 ${port}`;

    // 处理特定的监听错误，并提供友好的错误提示信息
    switch (error.code) {
        case 'EACCES':
            console.error(`${bind} 需要提升权限`);
            process.exit(1);
        // eslint-disable-next-line no-fallthrough
        case 'EADDRINUSE':
            console.error(`${bind} 已经在使用中`);
            process.exit(1);
        // eslint-disable-next-line no-fallthrough
        default:
            throw error;
    }
}

/**
 * HTTP/HTTPS 服务器 "listening" 事件的事件监听器。
 */
function onListening () {
    const addr = server.address();
    const bind = typeof addr === 'string' ? `管道 ${addr}` : `端口 ${addr!.port}`;
    debug(`正在监听 ${bind}`);
}

// ===================== socket ==============================

const websocketIo = new ServerIO(server, {
    cors: {
        origin: `http://${process.env.NODE_ENV === 'production' ? '152.136.254.142' : 'localhost'}:4000`, // allowed front-end ip
        methods: ['GET', 'POST'], // allowed HTTP methods
        allowedHeaders: ['my-custom-header'],
    },
});

export type RoomSocketMapType = Map<string, Map<string, Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>>>;

const roomMap: RoomSocketMapType = new Map();

export const addRoomSocket = (roomId: string, userName: string, socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>) => {
    const room = getRoomInfo(roomId) as RoomInfo;
    const player: PlayerInfoType | undefined = room?.players.get(userName);

    if (room && room.statu !== 'waiting') {
        if (player && !player.status.includes('disconnect')) {
            socket.emit('refuseConnect', 'player has existed, please check username');
            return [];
        }
        if (!player) {
            socket.emit('refuseConnect', 'this room has started, please go for another room');
            return [];
        }
    }
    // ================= collect sockets =====================
    const socketMap = roomMap.get(roomId)?.get(userName);

    // reconnect
    if (room && player?.status.includes('disconnect')) {
    // add socket back
        roomMap.get(roomId)?.set(userName, socket);
        room.players.set(userName, {
            ...player,
            status: ['waiting'],
        });
    } else if (!socketMap) {
        const userMap = roomMap.get(roomId);
        if (userMap) {
            userMap.set(userName, socket);
        } else {
            roomMap.set(roomId, new Map().set(userName, socket));
        }
    } else {
        while (roomMap.get(roomId)?.get(userName)) {
            userName += '-1';
        }

        roomMap.get(roomId)?.set(userName, socket);
    }

    socket.emit('updateUserName', userName);

    return [roomId, userName];
};

export const deleteRoomSocket = (roomId: string, userName?: string) => {
    const room = roomMap.get(roomId);

    if (!room) return;

    if (userName) {
        room.delete(userName);
    } else {
        roomMap.delete(roomId);
    }
};

websocketIo.on('connection', socket => {
    socket.on('connectRoom', ({ roomId, userName } : { roomId: string; userName: string }) => {
        let room = getRoomInfo(roomId) as RoomInfo;
        let player: PlayerInfoType | undefined = room?.players.get(userName);

        // add socket and update username
        [roomId, userName] = addRoomSocket(roomId, userName, socket);
    
        // ================== create room and add player ===========
        // reasgin value to room
        room = getRoomInfo(roomId) as RoomInfo;

        if (!room?.players.has(userName)) {
            if (room) {
                player = creatPlayer(userName, roomId);
                addPlayerForRoom(roomId, player);
            } else {
                player = creatPlayer(userName);
                room = createRoom(player, roomId);
            }
        }
    
        // report to all rooms in front-end
        reportToAllPlayersInRoom(roomId);

        // ==================== listeners ===================
        socket.on('startGame', (isShortCard = false) => {
            room.isShortCards = isShortCard;
            socketStartGame(roomId, isShortCard).then(() => {
                reportToAllPlayersInRoom(roomId);
            });
        });

        socket.on('callChips', (callChips?: number) => {
            socketCallChips(roomId, userName, callChips).then(({ victoryPlayers, playersCalledRes }: PlayerCallChipsRes) => {
                reportToAllPlayersInRoom(roomId, (socket) => {
                    // =================== victoryPlayers ==============
                    if (victoryPlayers) {
                        socket.emit('victoryPlayers', victoryPlayers);
                    }
                    if (playersCalledRes) {
                        socket.emit('playersCalledRes', playersCalledRes);
                    }
                    // ================= getGptPredicate ==============
                    // if (callChipsRes === true && currentPlayer.status.includes('calling')) {
                    //     getGptPredicate(roomId, currentPlayer, room.isShortCards).then(res => socket.emit('getGptPredicate', res));
                    // }
                });
            });
        });

        socket.on('turnToNextGame', () => {
            socketTurnToNextGame(roomId).then(() => {
                reportToAllPlayersInRoom(roomId);
            });
        });

        socket.on('clientSendAudioBlob', (blob) => {
            reportDataToAllPlayersInRoom({
                roomId, 
                excludePlayerName: [userName], 
                data: { 
                    userName,
                    blob,
                },
                evtKey: 'serverSendAudioBlob',
            });
        });

        socket.on('sendMessage', (msg: Omit<ChatMessageType, 'key'>) => {
            reportDataToAllPlayersInRoom({
                roomId, 
                excludePlayerName: [], 
                data: msg,
                evtKey: 'receiveMessage',
            });
        });

        socket.on('sendEmoji', (msg) => {
            reportDataToAllPlayersInRoom({
                roomId, 
                excludePlayerName: [], 
                data: msg,
                evtKey: 'receiveEmoji',
            });
        });

        // ================== handle disconnect =====================
        // delete player from waiting room when it disconnects
        socket.on('disconnect', () => {
            deletPlayer(roomId, userName);
        });

        socket.on('heartDetect', () => {
            updatePlayerActiveTime(roomId, userName);
        });
    });
});

// ===================== report in room ===================

export function reportDataToAllPlayersInRoom ({ roomId, evtKey, data, excludePlayerName = [] } : { roomId:string;evtKey: string; data: any, excludePlayerName: string[] }) {
    const room = getRoomInfo(roomId);

    if (room) {
        roomMap.get(roomId)?.forEach((socketItem, userName) => {
            if (!excludePlayerName.includes(userName)) {
                socketItem.emit(evtKey, data);
            }
        });
    }
}

export function reportToAllPlayersInRoom (roomId:string, callback?: (socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, player: PlayerInfoType) => void) {
    const room = getRoomInfo(roomId);
  
    if (room) {
        const playerMap: Map<string, PlayerInfoType> = new Map();
        room.players.forEach(player => {
            playerMap.set(player.name, player);
        });

        roomMap.get(roomId)?.forEach((socketItem, userName) => {
            socketItem.emit('room', room);
            const myPlayer = playerMap.get(userName);

            if (!myPlayer) throw new Error(`reportToAllPlayersInRoom did not find myPlayer ${userName}`);
            
            const allPlayers = Array.from(room.players.values());
            allPlayers.splice(myPlayer?.position, 1)[0];

            socketItem.emit('user', {
                myPlayer,
                otherPlayers: allPlayers,
            });

            callback && callback(socketItem, myPlayer);
        });
    }
}

// ========================== heart detection ===========================
function deletPlayer (roomId: string, userName: string) {
    socketDisconnect(roomId, userName).then(validRoomNum => {
        if (!validRoomNum) {
            deleteRoom(roomId);
            deleteRoomSocket(roomId);
        } else {
            deleteRoomSocket(roomId, userName);
        }
        
        reportToAllPlayersInRoom(roomId);
    });
}

setInterval(() => {
    roomMap.forEach((_socketMap, roomId) => {
        const room = getRoomInfo(roomId);
        const currentTime = new Date().getSeconds();

        room?.players.forEach((player, username) => {
            if (currentTime - player.activeTime > 15) {
                deletPlayer(roomId, username);
                console.log('heartbeat-ack err', username, roomMap.size);
            }
        });
    });
}, 10000);
