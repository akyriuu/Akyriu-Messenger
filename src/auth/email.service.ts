import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  async sendVerification(email: string, username: string, token: string) {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const frontendUrl = process.env.FRONTEND_URL?.replace(/\/+$/, '');
    const port = Number(process.env.SMTP_PORT ?? 465);

    if (
      !host ||
      !user ||
      !pass ||
      !frontendUrl ||
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65535
    ) {
      throw new ServiceUnavailableException(
        'O envio de e-mail não está configurado no servidor.',
      );
    }

    let appUrl: URL;
    try {
      appUrl = new URL(frontendUrl);
    } catch {
      throw new ServiceUnavailableException(
        'A URL do frontend não está configurada corretamente.',
      );
    }

    if (
      appUrl.protocol !== 'https:' &&
      appUrl.hostname !== 'localhost' &&
      appUrl.hostname !== '127.0.0.1' &&
      appUrl.hostname !== '[::1]'
    ) {
      throw new ServiceUnavailableException(
        'A URL pública do frontend precisa usar HTTPS.',
      );
    }

    const verificationUrl = new URL('/', appUrl);
    verificationUrl.hash = new URLSearchParams({
      verifyEmail: token,
    }).toString();

    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || user,
        to: email,
        subject: 'Confirme seu e-mail - Ryuto',
        text: `Olá, ${username}!\n\nConfirme seu e-mail acessando: ${verificationUrl.toString()}\n\nO link expira em 24 horas.`,
        html: `<p>Olá, ${this.escapeHtml(username)}!</p><p>Confirme seu e-mail clicando no link abaixo. Ele expira em 24 horas.</p><p><a href="${verificationUrl.toString()}">Confirmar meu e-mail</a></p>`,
      });
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException(
        'Não foi possível enviar o e-mail de confirmação. Verifique a configuração SMTP e tente novamente.',
      );
    }
  }

  private escapeHtml(value: string) {
    return value.replace(/[&<>"']/g, (character) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };
      return entities[character];
    });
  }
}
