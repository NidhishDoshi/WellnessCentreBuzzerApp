// utils/config.ts

// Declare __DEV__ for TypeScript
declare const __DEV__: boolean;

/**
 * Application Configuration
 * 
 * Update the SERVER_IP to match your server's local network IP address.
 * The server should be running on port 3000.
 * 
 * To find your server's IP:
 * - Windows: Run `ipconfig` in command prompt, look for IPv4 Address
 * - macOS/Linux: Run `ifconfig` or `ip addr`, look for inet address
 * 
 * Example: If your server's IP is 192.168.1.100, set:
 * SERVER_IP = '192.168.1.100'
 */

// ========================================
// CONFIGURATION - EDIT THIS VALUE
// ========================================
const SERVER_IP = '10.200.241.16'; // <-- Change this to your server's IP address
const SERVER_PORT = '3000';
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
