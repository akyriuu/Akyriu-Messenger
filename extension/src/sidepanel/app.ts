import { connectSocket, sendMessage, onNewMessage } from '../api/socket';

const myUserId = 'ID_DO_USUARIO';
const friendId = 'ID_DO_AMIGO';

connectSocket(myUserId);

onNewMessage((message) => {
  console.log('Nova mensagem:', message);
});

sendMessage(myUserId, friendId, 'Fala, mano!');
