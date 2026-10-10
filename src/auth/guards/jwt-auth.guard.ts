import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import * as jwt from 'jsonwebtoken';

export interface AuthenticatedUser {
  sub: string;
  username: string;
}

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Sua sessão expirou. Faça login novamente.',
      );
    }

    const token = authorization.slice(7);
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error(
        'Não foi possível concluir a operação. Tente novamente mais tarde',
        //  JWT_SECRET is not configured
      );
    }

    try {
      const payload = jwt.verify(token, secret);

      if (
        typeof payload === 'string' ||
        typeof payload.sub !== 'string' ||
        typeof payload.username !== 'string'
      ) {
        throw new UnauthorizedException(
          'A sessão expirou. Faça login novamente.',
        );
      }

      request.user = {
        sub: payload.sub,
        username: payload.username,
      };

      return true;
    } catch {
      throw new UnauthorizedException(
        'A sessão expirou. Faça login novamente.',
      );
    }
  }
}
