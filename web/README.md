# Orbit Messenger Web

Frontend React + TypeScript + Vite para o backend NestJS descrito na conversa.

## Rodar

1. Copie `.env.example` para `.env`.
2. Na pasta `web`, execute:

```bash
npm install
npm run dev
```

3. Deixe o backend NestJS rodando em `http://localhost:3000`.
4. Abra `http://localhost:5173`.

## Rotas esperadas no backend

- `POST /auth/register` `{ username, password }`
- `POST /auth/login` `{ username, password }` -> `{ accessToken, user }`
- `GET /friends`
- `GET /friends/requests/incoming`
- `GET /friends/requests/outgoing`
- `POST /friends/requests` `{ username }`
- `PATCH /friends/requests/:id/accept`
- `PATCH /friends/requests/:id/reject`
- `GET /messages/:otherUserId` -> histórico da conversa (adicionar o controller indicado abaixo se ainda não existir)

O Socket.IO precisa aceitar `auth: { token }` e os eventos:
- `user:online`
- `message:send` com `{ receiverId, content }`
- `message:new`, `message:sent`, `message:error`

## Adicionar endpoint para histórico (backend)

Crie `src/messages/messages.controller.ts`:

```ts
import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard, AuthenticatedRequest } from '../auth/guards/jwt-auth.guard';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get(':otherUserId')
  history(
    @Req() req: AuthenticatedRequest,
    @Param('otherUserId') otherUserId: string,
  ) {
    return this.messagesService.history(req.user.sub, otherUserId);
  }
}
```

Depois, registre o controller em `src/messages/messages.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

@Module({
  imports: [PrismaModule],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
```

## Notas

- O token fica no `localStorage` para facilitar o MVP. Para produção, avalie estratégia de sessão mais robusta e CSP.
- A lista online é baseada nos eventos recebidos após conexão. O backend atual usa um mapa em memória e não mantém presença distribuída.
- O frontend espera que a resposta de `GET /friends` tenha `{ friendshipId, friend: { id, username }, createdAt }`, como no `FriendsService` fornecido.
- Configure CORS no NestJS para permitir `http://localhost:5173`.
