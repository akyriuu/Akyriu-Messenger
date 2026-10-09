import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FriendsService } from './friends.service';
import { CreateFriendRequestDto } from './dto/create-friend-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/guards/jwt-auth.guard';

@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Post('requests')
  sendRequest(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateFriendRequestDto,
  ) {
    return this.friendsService.sendRequest(req.user.sub, dto.username);
  }

  @Patch('requests/:id/accept')
  acceptRequest(
    @Req() req: AuthenticatedRequest,
    @Param('id') friendshipId: string,
  ) {
    return this.friendsService.acceptRequest(req.user.sub, friendshipId);
  }

  @Patch('requests/:id/reject')
  rejectRequest(
    @Req() req: AuthenticatedRequest,
    @Param('id') friendshipId: string,
  ) {
    return this.friendsService.rejectRequest(req.user.sub, friendshipId);
  }

  @Get()
  listFriends(@Req() req: AuthenticatedRequest) {
    return this.friendsService.listFriends(req.user.sub);
  }

  @Get('requests/incoming')
  incoming(@Req() req: AuthenticatedRequest) {
    return this.friendsService.listIncomingRequests(req.user.sub);
  }

  @Get('requests/outgoing')
  outgoing(@Req() req: AuthenticatedRequest) {
    return this.friendsService.listOutgoingRequests(req.user.sub);
  }
}
