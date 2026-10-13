import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'node:crypto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateEmailDto } from './dto/email.dto';
import { EmailService } from './email.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  private createVerification() {
    const token = randomBytes(32).toString('hex');
    return {
      token,
      tokenHash: createHash('sha256').update(token).digest('hex'),
      tokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private getSecret(): string {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error('Configure o segredo JWT.');
    }

    return secret;
  }

  async register(dto: RegisterDto) {
    const username = dto.username.trim();
    const email = this.normalizeEmail(dto.email);

    if (Buffer.byteLength(dto.password, 'utf8') > 72) {
      throw new BadRequestException(
        'A senha não pode exceder 72 bytes em UTF-8.',
      );
    }

    const existing = await this.prisma.user.findUnique({
      where: { username },
    });

    if (existing) {
      throw new ConflictException('Este nome de usuário já está em uso.');
    }

    const existingEmail = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingEmail) {
      throw new ConflictException('Este e-mail já está em uso.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const verification = this.createVerification();

    const user = await this.prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        emailVerificationTokenHash: verification.tokenHash,
        emailVerificationExpiresAt: verification.tokenExpiresAt,
      },
      select: {
        id: true,
        username: true,
        createdAt: true,
      },
    });

    await this.emailService.sendVerification(
      email,
      username,
      verification.token,
    );

    return user;
  }

  async verifyEmail(token: string) {
    const emailVerificationTokenHash = createHash('sha256')
      .update(token)
      .digest('hex');
    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationTokenHash,
        emailVerificationExpiresAt: { gt: new Date() },
        emailVerifiedAt: null,
      },
      select: { id: true },
    });

    if (!user) {
      throw new BadRequestException(
        'O link de confirmação é inválido ou expirou.',
      );
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: new Date(),
        emailVerificationTokenHash: null,
        emailVerificationExpiresAt: null,
      },
    });

    return { message: 'E-mail confirmado. Você já pode entrar na sua conta.' };
  }

  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: this.normalizeEmail(email) },
      select: { id: true, email: true, username: true, emailVerifiedAt: true },
    });

    if (user && !user.emailVerifiedAt && user.email) {
      const verification = this.createVerification();
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerificationTokenHash: verification.tokenHash,
          emailVerificationExpiresAt: verification.tokenExpiresAt,
        },
      });
      await this.emailService.sendVerification(
        user.email,
        user.username,
        verification.token,
      );
    }

    return {
      message:
        'Se houver uma conta pendente para esse e-mail, enviaremos um novo link de confirmação.',
    };
  }

  async updateUnverifiedEmail(dto: UpdateEmailDto) {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username.trim() },
    });

    if (
      !user ||
      !(await bcrypt.compare(dto.password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    if (user.emailVerifiedAt) {
      throw new ConflictException(
        'O e-mail dessa conta já foi confirmado e não pode ser alterado por este fluxo.',
      );
    }

    const email = this.normalizeEmail(dto.email);
    const existingEmail = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingEmail && existingEmail.id !== user.id) {
      throw new ConflictException('Este e-mail já está em uso.');
    }

    const verification = this.createVerification();
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        email,
        emailVerificationTokenHash: verification.tokenHash,
        emailVerificationExpiresAt: verification.tokenExpiresAt,
      },
    });
    await this.emailService.sendVerification(
      email,
      user.username,
      verification.token,
    );

    return {
      message:
        'Enviamos um link de confirmação. Confirme o e-mail antes de entrar.',
    };
  }

  async login(dto: LoginDto) {
    if (Buffer.byteLength(dto.password, 'utf8') > 72) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const user = await this.prisma.user.findUnique({
      where: { username: dto.username.trim() },
    });

    if (!user) {
      throw new UnauthorizedException('Nome de usuário ou senha inválidos.');
    }

    const passwordIsValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!passwordIsValid) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    if (!user.email || !user.emailVerifiedAt) {
      throw new ForbiddenException(
        'Confirme seu e-mail para entrar ou atualize o e-mail desta conta.',
      );
    }

    const token = jwt.sign(
      {
        sub: user.id,
        username: user.username,
      },
      this.getSecret(),
      {
        expiresIn: '7d',
      },
    );

    return {
      accessToken: token,
      user: {
        id: user.id,
        username: user.username,
      },
    };
  }
}
