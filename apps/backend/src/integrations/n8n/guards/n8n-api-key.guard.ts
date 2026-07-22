import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { N8nConfigService } from '../n8n-config.service';

@Injectable()
export class N8nApiKeyGuard implements CanActivate {
  constructor(private readonly n8nConfigService: N8nConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers['authorization'] as string | undefined;
    const apiKey = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    if (!apiKey) throw new UnauthorizedException();

    const userId = await this.n8nConfigService.resolveUserIdByApiKey(apiKey);
    if (!userId) throw new UnauthorizedException();

    req.n8nUserId = userId;
    return true;
  }
}
