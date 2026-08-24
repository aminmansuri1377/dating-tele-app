import { Body, Controller, Post } from '@nestjs/common';
import { IsString } from 'class-validator';
import { AuthService } from './auth.service';

class TelegramLoginDto {
  @IsString()
  initData: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * The ONLY entry point into the app. The Mini App frontend sends the raw
   * `window.Telegram.WebApp.initData` string; we verify its HMAC signature
   * server-side before trusting anything in it.
   */
  @Post('telegram')
  async loginWithTelegram(@Body() dto: TelegramLoginDto) {
    return this.authService.loginWithTelegram(dto.initData);
  }
}
