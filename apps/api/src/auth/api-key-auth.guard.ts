import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    const validKey = process.env.API_KEY || 'demo-secret-key';

    if (!apiKey || apiKey !== validKey) {
      throw new UnauthorizedException('Invalid API Key');
    }

    // Attach mock user
    request.user = { ownerId: 'demo-owner' };
    return true;
  }
}
