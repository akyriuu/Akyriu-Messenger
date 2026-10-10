import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class FriendsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sends or updates a friend request using the receiver's username.
   */
  async sendRequest(requesterId: string, targetUsername: string) {
    const trimmedUsername = targetUsername.trim();

    const receiver = await this.prisma.user.findUnique({
      where: { username: trimmedUsername },
      select: { id: true, username: true },
    });

    if (!receiver) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    if (receiver.id === requesterId) {
      throw new BadRequestException('Você não pode adicionar a si mesmo..');
    }

    // Check for an existing relationship in either direction
    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId, receiverId: receiver.id },
          { requesterId: receiver.id, receiverId: requesterId },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        throw new ConflictException('Vocês já são amigos.');
      }

      if (existing.status === 'PENDING') {
        if (existing.requesterId === requesterId) {
          throw new ConflictException(
            'O pedido já foi enviado, aguarde a resposta.',
          );
        } else {
          throw new ConflictException(
            'Esse usuário já enviou um convite, tente aceita-lo.',
          );
        }
      }

      // Re-open a previously REJECTED request
      return this.prisma.friendship.update({
        where: { id: existing.id },
        data: {
          requesterId,
          receiverId: receiver.id,
          status: 'PENDING',
        },
      });
    }

    // Create a new friend request
    return this.prisma.friendship.create({
      data: {
        requesterId,
        receiverId: receiver.id,
        status: 'PENDING',
      },
    });
  }

  /**
   * Accepts a pending friend request.
   */
  async acceptRequest(userId: string, friendshipId: string) {
    const friendship = await this.prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      throw new NotFoundException('Pedido de amizade não encontrado.');
    }

    if (friendship.receiverId !== userId) {
      throw new ForbiddenException('Você não pdoe aceitar essa solicitação.');
    }

    if (friendship.status !== 'PENDING') {
      throw new ConflictException('Essa solicitação não está mais pendente.');
    }

    return this.prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: 'ACCEPTED' },
    });
  }

  /**
   * Rejects a pending friend request.
   */
  async rejectRequest(userId: string, friendshipId: string) {
    const friendship = await this.prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      throw new NotFoundException('Friend request not found');
    }

    if (friendship.receiverId !== userId) {
      throw new ForbiddenException('You cannot reject this request');
    }

    if (friendship.status !== 'PENDING') {
      throw new ConflictException('This request is no longer pending');
    }

    return this.prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: 'REJECTED' },
    });
  }

  /**
   * Unfriends a user / removes an existing friendship.
   */
  async removeFriend(userId: string, friendshipId: string) {
    const friendship = await this.prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      throw new NotFoundException('Friendship not found');
    }

    if (friendship.requesterId !== userId && friendship.receiverId !== userId) {
      throw new ForbiddenException('You are not part of this friendship');
    }

    return this.prisma.friendship.delete({
      where: { id: friendshipId },
    });
  }

  /**
   * Lists all accepted friends for a given user.
   */
  async listFriends(userId: string) {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ requesterId: userId }, { receiverId: userId }],
      },
      include: {
        requester: { select: { id: true, username: true } },
        receiver: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return friendships.map((friendship) => ({
      friendshipId: friendship.id,
      friend:
        friendship.requesterId === userId
          ? friendship.receiver
          : friendship.requester,
      createdAt: friendship.createdAt,
    }));
  }

  /**
   * Lists incoming pending friend requests.
   */
  async listIncomingRequests(userId: string) {
    return this.prisma.friendship.findMany({
      where: {
        receiverId: userId,
        status: 'PENDING',
      },
      include: {
        requester: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Lists outgoing pending friend requests.
   */
  async listOutgoingRequests(userId: string) {
    return this.prisma.friendship.findMany({
      where: {
        requesterId: userId,
        status: 'PENDING',
      },
      include: {
        receiver: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
