import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { MessagesService } from '../messages/messages.service';

type SocketUser = {
  sub: string;
  username: string;
};

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private onlineUsers = new Map<string, string>();

  constructor(private readonly messagesService: MessagesService) {}

  afterInit(server: Server) {
    server.use((client, next) => {
      const token = client.handshake.auth?.token;
      const secret = process.env.JWT_SECRET;

      if (typeof token !== 'string' || !secret) {
        return next(new Error('Unauthorized'));
      }

      try {
        const payload = jwt.verify(token, secret);

        if (
          typeof payload === 'string' ||
          typeof payload.sub !== 'string' ||
          typeof payload.username !== 'string'
        ) {
          return next(new Error('Unauthorized'));
        }

        client.data.user = {
          sub: payload.sub,
          username: payload.username,
        } satisfies SocketUser;

        next();
      } catch {
        next(new Error('Unauthorized'));
      }
    });
  }

  handleConnection(client: Socket) {
    console.log(`Authenticated socket connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const user = client.data.user as SocketUser | undefined;

    if (user && this.onlineUsers.get(user.sub) === client.id) {
      this.onlineUsers.delete(user.sub);

      this.server.emit('user:offline', {
        userId: user.sub,
      });
    }
  }

  @SubscribeMessage('user:online')
  setOnline(@ConnectedSocket() client: Socket) {
    const user = client.data.user as SocketUser;

    this.onlineUsers.set(user.sub, client.id);

    this.server.emit('user:online', {
      userId: user.sub,
    });
  }

  @SubscribeMessage('message:send')
  async sendMessage(
    @MessageBody()
    data: {
      receiverId: string;
      content: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user as SocketUser;

    try {
      const message = await this.messagesService.send(
        user.sub,
        data.receiverId,
        data.content,
      );

      const receiverSocket = this.onlineUsers.get(data.receiverId);

      if (receiverSocket) {
        this.server.to(receiverSocket).emit('message:new', message);
      }

      client.emit('message:sent', message);

      return message;
    } catch (error) {
      client.emit('message:error', {
        message:
          error instanceof Error ? error.message : 'Could not send message',
      });

      return;
    }
  }
}
