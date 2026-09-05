import { ForbiddenException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramValidationService, TelegramUserPayload } from './telegram-validation.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private telegramValidation: TelegramValidationService,
    private jwt: JwtService,
  ) {}

  async loginWithTelegram(initData: string) {
    const tgUser: TelegramUserPayload = this.telegramValidation.validate(initData);

    let user = await this.prisma.user.findUnique({
      where: { telegramId: BigInt(tgUser.id) },
      include: { profile: true },
    });

    let isNewUser = false;

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          telegramId: BigInt(tgUser.id),
          username: tgUser.username,
          firstName: tgUser.first_name,
          lastName: tgUser.last_name,
          languageCode: tgUser.language_code ?? 'en',
        },
        include: { profile: true },
      });
      isNewUser = true;
    } else {
      if (user.status === 'BANNED') {
        throw new ForbiddenException('This account has been banned.');
      }
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          username: tgUser.username,
          firstName: tgUser.first_name,
          lastName: tgUser.last_name,
          lastActiveAt: new Date(),
        },
        include: { profile: true },
      });
    }

    const accessToken = this.jwt.sign({
      sub: user.id,
      telegramId: user.telegramId.toString(),
      isAdmin: user.isAdmin,
    });

    // For new users (no profile yet), always require profile setup
    const needsProfileSetup = !user.profile?.isComplete;

    return {
      accessToken,
      isNewUser,
      needsProfileSetup,
      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        languageCode: user.languageCode,
      },
    };
  }
}
