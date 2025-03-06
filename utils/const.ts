export const privateKey = 'texas_game_server';
export const PORT = process.env.PORT || '3000';
export const maxInactiveTime = 5 * 60 * 1000; // 5分钟不活跃则视为掉线
export const heartbeatInterval = 30 * 1000; // 30秒发送一次心跳