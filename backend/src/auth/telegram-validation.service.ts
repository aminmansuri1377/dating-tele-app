import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface TelegramUserPayload {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
  language_code?: string;
}

/**
 * Validates the `initData` string Telegram sends to the Mini App.
 * This is THE critical security boundary: without this check, anyone
 * could forge a request claiming to be any Telegram user.
 *
 * Algorithm per Telegram docs:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
@Injectable()
export class TelegramValidationService {
  constructor(private config: ConfigService) {}

  /**
   * @param initData raw query-string sent by Telegram.WebApp.initData
   * @param maxAgeSeconds reject initData older than this (replay protection)
   */
  validate(initData: string, maxAgeSeconds = 86400): TelegramUserPayload {
    if (!initData) {
      throw new UnauthorizedException('Missing Telegram initData');
    }

    const botToken = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN is not configured');
    }

    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) {
      throw new UnauthorizedException('Invalid Telegram initData: missing hash');
    }
    params.delete('hash');

    // Build the data-check-string: sorted key=value pairs joined by \n
    const dataCheckArr: string[] = [];
    params.forEach((value, key) => dataCheckArr.push(`${key}=${value}`));
    dataCheckArr.sort();
    const dataCheckString = dataCheckArr.join('\n');

    // secret_key = HMAC_SHA256(bot_token, "WebAppData")
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (computedHash !== hash) {
      throw new UnauthorizedException('Telegram initData signature mismatch');
    }

    const authDate = Number(params.get('auth_date'));
    if (!authDate || Date.now() / 1000 - authDate > maxAgeSeconds) {
      throw new UnauthorizedException('Telegram initData expired');
    }

    const userJson = params.get('user');
    if (!userJson) {
      throw new UnauthorizedException('Telegram initData missing user field');
    }

    return JSON.parse(userJson) as TelegramUserPayload;
  }
}
