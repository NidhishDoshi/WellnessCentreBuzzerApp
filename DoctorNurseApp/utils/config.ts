
// Declare __DEV__ for TypeScript
declare const __DEV__: boolean;
//wellness ip :'10.200.205.182' around range
const SERVER_IP = '10.195.250.67'; // <-- Change this to your server's IP address
const SERVER_PORT = '43212';
// ========================================

export const CONFIG = {
  // Server URL for Socket.IO connection
  SERVER_URL: `http://${SERVER_IP}:${SERVER_PORT}`,
  
  // Development mode flag
  IS_DEV: __DEV__,
  
  // Connection settings
  SOCKET_OPTIONS: {
    transports: ['websocket'] as const,
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  },
};

export default CONFIG;
