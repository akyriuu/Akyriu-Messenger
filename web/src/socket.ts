import { io, type Socket } from 'socket.io-client';
import type { ChatMessage } from './types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

export type ServerToClientEvents = {
  'message:new': (message: ChatMessage) => void;
  'message:sent': (message: ChatMessage) => void;
  'message:error': (error: { message: string }) => void;
  'user:online': (data: { userId: string }) => void;
  'user:offline': (data: { userId: string }) => void;
};

export type ClientToServerEvents = {
  'user:online': () => void;
  'message:send': (data: { receiverId: string; content: string }) => void;
};

export type MessengerSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function createSocket(token: string): MessengerSocket {
  return io(SOCKET_URL, {
    autoConnect: false,
    auth: { token },
    transports: ['websocket'],
  });
}
