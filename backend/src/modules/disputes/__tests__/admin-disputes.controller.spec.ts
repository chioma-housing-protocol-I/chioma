import { Test, TestingModule } from '@nestjs/testing';
import { AdminDisputesController } from '../admin-disputes.controller';
import { DisputesService } from '../disputes.service';
import { AdminUpdateDisputeDto } from '../dto/admin-update-dispute.dto';
import { Dispute, DisputeStatus, DisputeType } from '../entities/dispute.entity';

describe('AdminDisputesController', () => {
    let controller: AdminDisputesController;
    let service: DisputesService;

    const mockDispute: Dispute = {
        id: 1,
        disputeId: 'DSP-2026-001',
        agreementId: 'agr-123',
        agreement: null,
        initiatedBy: 'user-123',
        initiator: null,
        disputeType: DisputeType.RENT_PAYMENT,
        requestedAmount: 100000,
        description: 'Test dispute',
        status: DisputeStatus.OPEN,
        resolution: null,
        resolvedBy: null,
        resolver: null,
        evidence: [],
        comments: [],
        resolvedAt: null,
        metadata: null,
        blockchainAgreementId: null,
        detailsHash: null,
        blockchainRaisedAt: null,
        blockchainResolvedAt: null,
        votesFavorLandlord: 0,
        votesFavorTenant: 0,
        blockchainOutcome: null,
        transactionHash: null,
        blockchainSyncedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(async () => {
        const mockDisputesService = {
            update: jest.fn().mockResolvedValue(mockDispute),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AdminDisputesController],
            providers: [
                {
                    provide: DisputesService,
                    useValue: mockDisputesService,
                },
            ],
        }).compile();

        controller = module.get<AdminDisputesController>(AdminDisputesController);
        service = module.get<DisputesService>(DisputesService);
    });

    describe('updateDispute', () => {
        it('should update dispute with numeric ID', async () => {
            const updateDto: AdminUpdateDisputeDto = {
                status: DisputeStatus.RESOLVED,
                resolution: 'Resolved by admin',
            };

            const req = { user: { id: 'admin-user-123' } };

            const result = await controller.updateDispute('1', updateDto, req);

            expect(service.update).toHaveBeenCalledWith(1, updateDto, 'admin-user-123');
            expect(result).toEqual(mockDispute);
        });

        it('should reject invalid numeric ID', async () => {
            const updateDto: AdminUpdateDisputeDto = {
                status: DisputeStatus.RESOLVED,
            };

            const req = { user: { id: 'admin-user-123' } };

            await expect(
                controller.updateDispute('invalid-id', updateDto, req),
            ).rejects.toThrow('Invalid dispute ID');
        });

        it('should handle string dispute IDs that cannot be parsed', async () => {
            const updateDto: AdminUpdateDisputeDto = {
                status: DisputeStatus.UNDER_REVIEW,
            };

            const req = { user: { id: 'admin-user-123' } };

            await expect(
                controller.updateDispute('dis-101', updateDto, req),
            ).rejects.toThrow('Invalid dispute ID');
        });
    });
});
