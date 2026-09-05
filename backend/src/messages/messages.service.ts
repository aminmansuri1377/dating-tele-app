import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { TelegramNotifierService } from '../matches/telegram-notifier.service';
import { MessageType } from '@prisma/client';

const FREE_DAILY_NEW_CHAT_MESSAGES = 3; // free-tier male limit: 3 messages/day to NEW matches

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private notifier: TelegramNotifierService,
  ) {}

  private todayUtc(): Date {
    const d = new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  async getMessages(userId: string, matchId: string, cursor?: string, take = 30) {
    await this.assertParticipant(userId, matchId);
    return this.prisma.message.findMany({
      where: { matchId },
      orderBy: { createdAt: 'desc' },
      take,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
  }

  async assertParticipant(userId: string, matchId: string) {
    const match = await this.prisma.match.findFirst({
      where: { id: matchId, OR: [{ userAId: userId }, { userBId: userId }] },
    });
    if (!match || !match.isActive) throw new NotFoundException('Match not found or inactive');
    return match;
  }

  async sendMessage(
    senderId: string,
    matchId: string,
    payload: { type: MessageType; content?: string; imageUrl?: string },
  ) {
    const match = await this.assertParticipant(senderId, matchId);
    const recipientId = match.userAId === senderId ? match.userBId : match.userAId;

    if (await this.usersService.isBlocked(senderId, recipientId)) {
      throw new ForbiddenException('Cannot message a blocked user');
    }

    // Free-tier male gating: is this a "new" conversation (no prior message FROM this user in this match)?
    const [profile, isPremium] = await Promise.all([
      this.prisma.profile.findUnique({ where: { userId: senderId } }),
      this.usersService.hasActivePremium(senderId),
    ]);

    if (profile?.gender === 'MALE' && !isPremium) {
      const priorFromMe = await this.prisma.message.count({ where: { matchId, senderId } });
      const isNewConversation = priorFromMe === 0;

      if (isNewConversation) {
        const usage = await this.prisma.dailyUsage.upsert({
          where: { userId_date: { userId: senderId, date: this.todayUtc() } },
          create: { userId: senderId, date: this.todayUtc(), newChatMsgCount: 0 },
          update: {},
        });
        if (usage.newChatMsgCount >= FREE_DAILY_NEW_CHAT_MESSAGES) {
          throw new ForbiddenException(
            'Daily limit of 3 messages to new matches reached. Upgrade to Premium for unlimited messaging.',
          );
        }
        await this.prisma.dailyUsage.update({
          where: { userId_date: { userId: senderId, date: this.todayUtc() } },
          data: { newChatMsgCount: { increment: 1 } },
        });
      }
    }

    const message = await this.prisma.message.create({
      data: { matchId, senderId, type: payload.type, content: payload.content, imageUrl: payload.imageUrl },
    });

    const recipient = await this.prisma.user.findUnique({ where: { id: recipientId } });
    const senderProfile = await this.prisma.profile.findUnique({ where: { userId: senderId } });
    if (recipient) {
      this.notifier
        .notifyNewMessage(recipient.telegramId, senderProfile?.displayName ?? 'Someone')
        .catch(() => undefined);
    }

    return message;
  }

  async markRead(userId: string, matchId: string) {
    await this.assertParticipant(userId, matchId);
    await this.prisma.message.updateMany({
      where: { matchId, senderId: { not: userId }, isRead: false },
      data: { isRead: true },
    });
    return { ok: true };
  }
}
