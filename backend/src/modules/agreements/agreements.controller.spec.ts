import { AgreementsController } from './agreements.controller';
import { AgreementsService } from './agreements.service';
import { AgreementStatus } from '../rent/entities/rent-contract.entity';

describe('AgreementsController (state transitions)', () => {
  let controller: AgreementsController;
  let service: {
    sign: jest.Mock;
    activate: jest.Mock;
    transition: jest.Mock;
    terminate: jest.Mock;
  };

  beforeEach(() => {
    service = {
      sign: jest.fn().mockResolvedValue({ id: 'agr-1', status: AgreementStatus.SIGNED }),
      activate: jest
        .fn()
        .mockResolvedValue({ id: 'agr-1', status: AgreementStatus.ACTIVE }),
      transition: jest
        .fn()
        .mockResolvedValue({ id: 'agr-1', status: AgreementStatus.ACTIVE }),
      terminate: jest
        .fn()
        .mockResolvedValue({ id: 'agr-1', status: AgreementStatus.TERMINATED }),
    };
    controller = new AgreementsController(service as unknown as AgreementsService);
  });

  it('sign delegates to service with idempotency payload', async () => {
    await controller.sign('agr-1', { idempotencyKey: 'idem-1' } as any);
    expect(service.sign).toHaveBeenCalledWith('agr-1', { idempotencyKey: 'idem-1' });
  });

  it('activate delegates to service', async () => {
    await controller.activate('agr-1', { enforcePreconditions: true } as any);
    expect(service.activate).toHaveBeenCalledWith('agr-1', { enforcePreconditions: true });
  });

  it('transition delegates to service', async () => {
    await controller.transition('agr-1', {
      status: AgreementStatus.ACTIVE,
      reason: 'manual',
    } as any);
    expect(service.transition).toHaveBeenCalledWith('agr-1', {
      status: AgreementStatus.ACTIVE,
      reason: 'manual',
    });
  });

  it('terminate delegates to service', async () => {
    await controller.terminate('agr-1', { terminationReason: 'end' } as any);
    expect(service.terminate).toHaveBeenCalledWith('agr-1', { terminationReason: 'end' });
  });
});
