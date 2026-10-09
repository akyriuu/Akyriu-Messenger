import { io } from 'socket.io-client';

export const socket = io('http://localhost:3000', {
  autoConnect: false,
  transports: ['websocket'],
});

export function connectSocket(userId: string) {
  socket.connect();

  socket.on('connect', () => {
    console.log('Connected:', socket.id);

    socket.emit('user:online', { userId });
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection failed:', error.message);
  });
}

export function sendMessage(
  senderId: string,
  receiverId: string,
  content: string,
) {
  socket.emit('message:send', {
    senderId,
    receiverId,
    content,
  });
}

export function onNewMessage(callback: (message: unknown) => void) {
  socket.on('message:new', callback);
}
