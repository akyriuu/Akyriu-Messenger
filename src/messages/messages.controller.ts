// src/messages/messages.controller.ts
import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/guards/jwt-auth.guard';
import { MessagesService } from './messages.service';

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
