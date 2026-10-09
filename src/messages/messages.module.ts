import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { MessagesService } from './messages.service';

@Module({
  imports: [PrismaModule],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
