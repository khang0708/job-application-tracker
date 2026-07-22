import { UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { N8nApiKeyGuard } from './n8n-api-key.guard';
import { N8nConfigService } from '../n8n-config.service';

function buildContext(req: any): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

describe('N8nApiKeyGuard', () => {
  let guard: N8nApiKeyGuard;
  let configService: { resolveUserIdByApiKey: jest.Mock };

  beforeEach(() => {
    configService = { resolveUserIdByApiKey: jest.fn() };
    guard = new N8nApiKeyGuard(configService as unknown as N8nConfigService);
  });

  it('allows the request and attaches n8nUserId when the key is valid', async () => {
    configService.resolveUserIdByApiKey.mockResolvedValueOnce('user-1');
    const req: any = { headers: { authorization: 'Bearer valid-key' } };

    const result = await guard.canActivate(buildContext(req));

    expect(result).toBe(true);
    expect(req.n8nUserId).toBe('user-1');
  });

  it('throws UnauthorizedException when the header is missing', async () => {
    const req = { headers: {} };
    await expect(guard.canActivate(buildContext(req))).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when the key does not resolve to a user', async () => {
    configService.resolveUserIdByApiKey.mockResolvedValueOnce(null);
    const req = { headers: { authorization: 'Bearer bad-key' } };
    await expect(guard.canActivate(buildContext(req))).rejects.toThrow(UnauthorizedException);
  });
});
