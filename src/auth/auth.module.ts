import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailService } from './email.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [AuthService, EmailService, JwtAuthGuard],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
