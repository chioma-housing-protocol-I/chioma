import { Test, TestingModule } from '@nestjs/testing';
import { OAuth2Controller } from './oauth2.controller';
import { OAuth2Service } from './oauth2.service';
import { OAuth2Provider } from './oauth2.types';
import { User, UserRole } from '../../users/entities/user.entity';

describe('OAuth2Controller', () => {
  let controller: OAuth2Controller;

  const mockOAuth2Service = {
    initiateAuthorization: jest.fn(),
    completeAuthorization: jest.fn(),
    getUserProfile: jest.fn(),
    linkAccount: jest.fn(),
    initiateAccountLink: jest.fn(),
    logout: jest.fn(),
    revokeProviderToken: jest.fn(),
  };

  const mockUser = {
    id: 'user-1',
    email: 'user@example.com',
    role: UserRole.USER,
  } as User;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OAuth2Controller],
      providers: [{ provide: OAuth2Service, useValue: mockOAuth2Service }],
    }).compile();

    controller = module.get<OAuth2Controller>(OAuth2Controller);
  });

  it('initiates authorization', () => {
    mockOAuth2Service.initiateAuthorization.mockReturnValue({
      authorizationUrl: 'https://provider/authorize',
      state: 'state-1',
    });

    const result = controller.initiateAuthorization({
      provider: OAuth2Provider.GOOGLE,
    });

    expect(result.state).toBe('state-1');
    expect(mockOAuth2Service.initiateAuthorization).toHaveBeenCalledWith(
      OAuth2Provider.GOOGLE,
      undefined,
    );
  });

  it('completes authorization callback', async () => {
    mockOAuth2Service.completeAuthorization.mockResolvedValue({
      accessToken: 'jwt-access',
      refreshToken: 'jwt-refresh',
      provider: OAuth2Provider.GOOGLE,
      user: mockUser,
    });

    const result = await controller.completeAuthorization({
      provider: OAuth2Provider.GOOGLE,
      code: 'code-1',
      state: 'state-1',
    });

    expect(result.accessToken).toBe('jwt-access');
  });

  it('links provider account for authenticated user', async () => {
    mockOAuth2Service.linkAccount.mockResolvedValue({
      id: 'link-1',
      userId: mockUser.id,
      provider: OAuth2Provider.GITHUB,
      providerUserId: 'gh-1',
      linkedAt: new Date(),
    });

    const result = await controller.linkAccount(mockUser, {
      provider: OAuth2Provider.GITHUB,
      code: 'code-1',
      state: 'state-1',
    });

    expect(result.provider).toBe(OAuth2Provider.GITHUB);
    expect(mockOAuth2Service.linkAccount).toHaveBeenCalledWith(
      mockUser.id,
      OAuth2Provider.GITHUB,
      'code-1',
      'state-1',
      undefined,
    );
  });

  it('logs out authenticated user', async () => {
    mockOAuth2Service.logout.mockResolvedValue({
      message: 'Logged out successfully',
      revoked: true,
    });

    const result = await controller.logout(mockUser, OAuth2Provider.GOOGLE);

    expect(result.revoked).toBe(true);
    expect(mockOAuth2Service.logout).toHaveBeenCalledWith(
      mockUser.id,
      OAuth2Provider.GOOGLE,
    );
  });

  it('revokes provider token', async () => {
    await controller.revokeToken({
      provider: OAuth2Provider.GOOGLE,
      token: 'token-1',
    });

    expect(mockOAuth2Service.revokeProviderToken).toHaveBeenCalledWith(
      OAuth2Provider.GOOGLE,
      'token-1',
    );
  });
});
