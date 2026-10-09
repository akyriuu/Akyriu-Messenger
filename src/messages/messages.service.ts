import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async send(senderId: string, receiverId: string, content: string) {
    const normalizedContent = content?.trim();

    if (
      !receiverId ||
      typeof normalizedContent !== 'string' ||
      normalizedContent.length === 0 ||
      normalizedContent.length > 4000
    ) {
      throw new BadRequestException('Invalid message');
    }

    if (senderId === receiverId) {
      throw new BadRequestException('You cannot message yourself');
    }

    const receiver = await this.prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true },
    });

    if (!receiver) {
      throw new NotFoundException('Receiver not found');
    }

    const friendship = await this.prisma.friendship.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { requesterId: senderId, receiverId },
          { requesterId: receiverId, receiverId: senderId },
        ],
      },
    });

    if (!friendship) {
      throw new ForbiddenException('You can only message accepted friends');
    }

    return this.prisma.message.create({
      data: {
        senderId,
        receiverId,
        content: normalizedContent,
      },
    });
  }

  async history(userId: string, otherUserId: string) {
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { requesterId: userId, receiverId: otherUserId },
          { requesterId: otherUserId, receiverId: userId },
        ],
      },
    });

    if (!friendship) {
      throw new ForbiddenException(
        'You can only view messages with accepted friends',
      );
    }

    return this.prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
