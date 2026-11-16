import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { MfaService } from './mfa.service';
import { MfaDevice, MfaDeviceStatus } from '../entities/mfa-device.entity';
import { User } from '../../users/entities/user.entity';

describe('MfaService', () => {
  let service: MfaService;
  let mockMfaDeviceRepository: {
    find: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(async () => {
    mockMfaDeviceRepository = {
      find: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MfaService,
        {
          provide: getRepositoryToken(MfaDevice),
          useValue: mockMfaDeviceRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'SECURITY_ENCRYPTION_KEY' ? 'a'.repeat(32) : undefined,
            ),
          },
        },
        { provide: JwtService, useValue: {} },
      ],
    }).compile();

    service = module.get(MfaService);
  });

  describe('disableMfa', () => {
    it('issues a single batched save for all active devices instead of one per device (#2078)', async () => {
      const devices = [
        { id: 'device-1', status: MfaDeviceStatus.ACTIVE },
        { id: 'device-2', status: MfaDeviceStatus.ACTIVE },
        { id: 'device-3', status: MfaDeviceStatus.ACTIVE },
      ] as MfaDevice[];
      mockMfaDeviceRepository.find.mockResolvedValue(devices);

      await service.disableMfa('user-1');

      expect(mockMfaDeviceRepository.save).toHaveBeenCalledTimes(1);
      expect(mockMfaDeviceRepository.save).toHaveBeenCalledWith(
        devices.map((d) =>
          expect.objectContaining({
            id: d.id,
            status: MfaDeviceStatus.DISABLED,
          }),
        ),
      );
      devices.forEach((d) => expect(d.status).toBe(MfaDeviceStatus.DISABLED));
    });

    it('does not call save at all when the user has no active devices', async () => {
      mockMfaDeviceRepository.find.mockResolvedValue([]);

      await service.disableMfa('user-1');

      expect(mockMfaDeviceRepository.save).not.toHaveBeenCalled();
    });
  });
});
