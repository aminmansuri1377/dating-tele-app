import { Injectable, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

@Injectable()
export class AdminGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const active = (await super.canActivate(context)) as boolean;
    if (!active) return false;
    const req = context.switchToHttp().getRequest();
    if (!req.user?.isAdmin) {
      throw new ForbiddenException('Admin access required');
    }
    return true;
  }
}
