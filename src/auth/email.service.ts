import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendVerification(email: string, username: string, token: string) {
    const apiKey = process.env.RESEND_API_KEY;
    const sender = process.env.EMAIL_FROM;
    const frontendUrl = process.env.FRONTEND_URL?.replace(/\/+$/, '');

    if (!apiKey || !sender || !frontendUrl) {
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

    let response: Response;
    try {
      response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: sender,
          to: [email],
          subject: 'Confirme seu e-mail - Ryuto',
          text:
            `Olá, ${username}!\n\n` +
            `Confirme seu e-mail acessando: ${verificationUrl.toString()}\n\n` +
            'O link expira em 24 horas.',
          html:
            `<p>Olá, ${this.escapeHtml(username)}!</p>` +
            '<p>Confirme seu e-mail clicando no link abaixo. ' +
            'Ele expira em 24 horas.</p>' +
            `<p><a href="${verificationUrl.toString()}">` +
            'Confirmar meu e-mail</a></p>',
        }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      this.logger.error(
        'Falha ao conectar à API do Resend.',
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException(
        'Não foi possível conectar ao serviço de e-mail. Tente novamente.',
      );
    }

    if (!response.ok) {
      this.logger.error(`A API do Resend respondeu com HTTP ${response.status}.`);
      if (response.status === 401 || response.status === 403) {
        throw new ServiceUnavailableException(
          'A chave do Resend é inválida ou o remetente ainda não foi verificado.',
        );
      }
      if (response.status === 429) {
        throw new ServiceUnavailableException(
          'O limite de envio do Resend foi atingido. Tente novamente mais tarde.',
        );
      }
      if (response.status === 400 || response.status === 422) {
        throw new ServiceUnavailableException(
          'O Resend recusou o e-mail. Confira o remetente e o endereço de destino.',
        );
      }
      throw new ServiceUnavailableException(
        `O serviço de e-mail falhou (HTTP ${response.status}). Tente novamente.`,
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
