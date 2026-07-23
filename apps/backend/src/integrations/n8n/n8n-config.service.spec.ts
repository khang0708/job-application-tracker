import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { N8nConfigService } from './n8n-config.service';
import { UserN8nConfig } from './user-n8n-config.entity';

describe('N8nConfigService', () => {
  let service: N8nConfigService;
  let repo: jest.Mocked<Repository<UserN8nConfig>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        N8nConfigService,
        {
          provide: getRepositoryToken(UserN8nConfig),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn((data) => data),
            save: jest.fn((data) => Promise.resolve({ id: 'config-1', ...data })),
          },
        },
      ],
    }).compile();

    service = module.get(N8nConfigService);
    repo = module.get(getRepositoryToken(UserN8nConfig));
  });

  it('generates a new api key and resolves it back to the same user', async () => {
    repo.findOne.mockResolvedValueOnce(null); // no existing config for this user yet
    const { apiKey } = await service.regenerate('user-1');

    const savedRow = (repo.save as jest.Mock).mock.calls[0][0];
    repo.findOne.mockResolvedValueOnce({ userId: 'user-1', apiKeyHash: savedRow.apiKeyHash } as UserN8nConfig);

    const resolvedUserId = await service.resolveUserIdByApiKey(apiKey);
    expect(resolvedUserId).toBe('user-1');
  });

  it('returns null for an api key that does not exist', async () => {
    repo.findOne.mockResolvedValueOnce(null);
    const resolvedUserId = await service.resolveUserIdByApiKey('not-a-real-key');
    expect(resolvedUserId).toBeNull();
  });

  it('reports configured: false when the user has no config yet', async () => {
    repo.findOne.mockResolvedValueOnce(null);
    const config = await service.getConfig('user-1');
    expect(config).toEqual({ configured: false, apiKeyPrefix: null });
  });

  it('overwrites existing api key when config already exists', async () => {
    const oldApiKeyHash = 'old-hash-value-12345';
    const oldApiKeyPrefix = 'old_prefix_123';
    const existingConfig = {
      id: 'config-1',
      userId: 'user-1',
      apiKeyHash: oldApiKeyHash,
      apiKeyPrefix: oldApiKeyPrefix,
    } as UserN8nConfig;

    repo.findOne.mockResolvedValueOnce(existingConfig);
    const { apiKey, apiKeyPrefix: returnedPrefix } = await service.regenerate('user-1');

    // Verify repo.create was NOT called in this branch
    expect(repo.create).not.toHaveBeenCalled();

    // Verify repo.save was called exactly once
    expect(repo.save).toHaveBeenCalledTimes(1);
    const savedObject = (repo.save as jest.Mock).mock.calls[0][0];

    // Should be the same object instance (in-place mutation)
    expect(savedObject).toBe(existingConfig);

    // Old hash should have been replaced with a new one
    expect(savedObject.apiKeyHash).not.toBe(oldApiKeyHash);

    // New prefix should match the first 12 chars of the returned apiKey
    expect(returnedPrefix).toBe(apiKey.slice(0, 12));
    expect(savedObject.apiKeyPrefix).toBe(returnedPrefix);
  });
});
