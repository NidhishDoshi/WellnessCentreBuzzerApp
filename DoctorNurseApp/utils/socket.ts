// utils/socket.ts
import { io, Socket } from 'socket.io-client';
import { CONFIG } from './config';

// Socket instance
let socket: Socket | null = null;

// Connection state listeners
type ConnectionListener = (connected: boolean) => void;
const connectionListeners: ConnectionListener[] = [];

// Call listeners for receiving updates
type CallsListener = (calls: Call[]) => void;
const callsListeners: CallsListener[] = [];

// Call type
export interface Call {
  id: string | number;
  doctorId: string | number;
  doctorName: string;
  room: string;
  timestamp: Date | string;
  status: 'active' | 'completed';
}

/**
 * Initialize socket connection
 */
export function initSocket(): Socket {
  if (socket?.connected) {
    return socket;
  }

  socket = io(CONFIG.SERVER_URL, CONFIG.SOCKET_OPTIONS);

  // Connection event handlers
  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id);
    notifyConnectionListeners(true);
  });

  socket.on('disconnect', (reason: string) => {
    console.log('Socket disconnected:', reason);
    notifyConnectionListeners(false);
  });

  socket.on('connect_error', (error: Error) => {
    // console.error('Socket connection error:', error.message);
    notifyConnectionListeners(false);
  });

  // Call event handlers
  socket.on('activeCalls', (calls: Call[]) => {
    console.log('Received active calls:', calls);
    notifyCallsListeners(calls);
  });

  socket.on('newCall', (call: Call) => {
    console.log('New call received:', call);
  });

  socket.on('callCompleted', (callId: string | number) => {
    console.log('Call completed:', callId);
  });

  return socket;
}

/**
 * Get current socket instance
 */
export function getSocket(): Socket | null {
  return socket;
}

/**
 * Check if socket is connected
 */
export function isConnected(): boolean {
  return socket?.connected ?? false;
}

/**
 * Disconnect socket
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Send a doctor call to the server
 */
export function sendDoctorCall(data: {
  doctorId: string | number;
  doctorName: string;
  room: string;
}): boolean {
  if (!socket?.connected) {
    console.error('Cannot send call: Socket not connected');
    return false;
  }

  console.log('Sending doctor call:', data);
  socket.emit('doctorCall', {
    doctorId: data.doctorId,
    doctorName: data.doctorName,
    room: data.room,
  });

  return true;
}

/**
 * Mark a call as completed
 */
export function completeCall(callId: string | number): boolean {
  if (!socket?.connected) {
    console.error('Cannot complete call: Socket not connected');
    return false;
  }

  console.log('Completing call:', callId);
  socket.emit('completeCall', callId);

  return true;
}

/**
 * Add a connection state listener
 */
export function addConnectionListener(listener: ConnectionListener): () => void {
  connectionListeners.push(listener);
  
  // Return unsubscribe function
  return () => {
    const index = connectionListeners.indexOf(listener);
    if (index > -1) {
      connectionListeners.splice(index, 1);
    }
  };
}

/**
 * Add a calls listener
 */
export function addCallsListener(listener: CallsListener): () => void {
  callsListeners.push(listener);
  
  // Return unsubscribe function
  return () => {
    const index = callsListeners.indexOf(listener);
    if (index > -1) {
      callsListeners.splice(index, 1);
    }
  };
}

/**
 * Notify all connection listeners
 */
function notifyConnectionListeners(connected: boolean): void {
  connectionListeners.forEach((listener) => listener(connected));
}

/**
 * Notify all calls listeners
 */
function notifyCallsListeners(calls: Call[]): void {
  callsListeners.forEach((listener) => listener(calls));
}

/**
 * Get server URL (for debugging)
 */
export function getServerUrl(): string {
  return CONFIG.SERVER_URL;
}

export default {
  initSocket,
  getSocket,
  isConnected,
  disconnectSocket,
  sendDoctorCall,
  completeCall,
  addConnectionListener,
  addCallsListener,
  getServerUrl,
};
