const { io } = require('socket.io-client');

const userA = io('http://localhost:3000');
const userB = io('http://localhost:3000');

let connected = 0;

function checkConnections() {
  connected++;

  if (connected !== 2) return;

  console.log('✅ Os dois usuários estão conectados!');

  userA.emit('user:online', { userId: 'user-A' });
  userB.emit('user:online', { userId: 'user-B' });

  setTimeout(() => {
    userA.emit('message:send', {
      senderId: 'user-A',
      receiverId: 'user-B',
      content: 'Fala, mano! Mensagem de teste.',
    });
  }, 500);
}

userA.on('connect', checkConnections);
userB.on('connect', checkConnections);

userB.on('message:new', (message) => {
  console.log('📩 Usuário B recebeu:', message);

  userA.disconnect();
  userB.disconnect();
});

for (const [name, socket] of [
  ['A', userA],
  ['B', userB],
]) {
  socket.on('connect_error', (error) => {
    console.error(`Erro no usuário ${name}:`, error.message);
  });
}
