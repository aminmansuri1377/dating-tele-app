import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Sends push notifications to users via the Telegram Bot API
 * (separate from Mini App auth — this uses the bot's sendMessage endpoint).
 */
@Injectable()
export class TelegramNotifierService {
  private readonly logger = new Logger(TelegramNotifierService.name);
  private readonly botToken: string;

  constructor(private config: ConfigService) {
    this.botToken = this.config.get<string>('TELEGRAM_BOT_TOKEN')!;
  }

  private async sendMessage(telegramId: bigint | number, text: string) {
    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramId.toString(),
          text,
          parse_mode: 'HTML',
        }),
      });
    } catch (err) {
      this.logger.warn(`Failed to notify ${telegramId}: ${err}`);
    }
  }

  async notifyMatch(userA: any, userB: any) {
    await Promise.all([
      this.sendMessage(userA.telegramId, `🎉 You matched with ${userB.profile?.displayName ?? 'someone'}!`),
      this.sendMessage(userB.telegramId, `🎉 You matched with ${userA.profile?.displayName ?? 'someone'}!`),
    ]);
  }

  async notifyNewMessage(recipientTelegramId: bigint | number, senderName: string) {
    await this.sendMessage(recipientTelegramId, `💬 New message from ${senderName}`);
  }
}
