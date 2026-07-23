import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InquiriesService } from './inquiries.service';

describe('InquiriesService', () => {
  const inquiryRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const propertyRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const userRepository = {
    find: jest.fn(),
  };

  const notificationsService = {
    notify: jest.fn(),
  };

  let service: InquiriesService;

  beforeEach(() => {
    jest.clearAllMocks();
    propertyRepository.find.mockResolvedValue([]);
    userRepository.find.mockResolvedValue([]);
    service = new InquiriesService(
      inquiryRepository as any,
      propertyRepository as any,
      userRepository as any,
      notificationsService as any,
    );
  });

  it('creates inquiry and triggers owner notification', async () => {
    propertyRepository.findOne.mockResolvedValue({
      id: 'property-1',
      ownerId: 'owner-1',
      title: 'Lekki Apartment',
    });

    inquiryRepository.create.mockImplementation((input) => input);
    inquiryRepository.save.mockImplementation(async (input) => ({
      id: 'inq-1',
      ...input,
    }));

    const result = await service.createInquiry('tenant-1', {
      propertyId: 'property-1',
      message: 'Is this still available?',
      name: 'Jane',
      email: 'jane@example.com',
      phone: '+2340000000',
    });

    expect(result.id).toBe('inq-1');
    expect(notificationsService.notify).toHaveBeenCalledWith(
      'owner-1',
      'New property inquiry',
      'Jane sent an inquiry for Lekki Apartment.',
      'PROPERTY_INQUIRY',
    );
  });

  it('throws if property does not exist', async () => {
    propertyRepository.findOne.mockResolvedValue(null);

    await expect(
      service.createInquiry('tenant-1', {
        propertyId: 'missing',
        message: 'hello',
      } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws if user inquires on own property', async () => {
    propertyRepository.findOne.mockResolvedValue({
      id: 'property-1',
      ownerId: 'tenant-1',
      title: 'Self Owned',
    });

    await expect(
      service.createInquiry('tenant-1', {
        propertyId: 'property-1',
        message: 'hello',
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('enriches incoming inquiries with property details and sender contact', async () => {
    inquiryRepository.find.mockResolvedValue([
      {
        id: 'inq-1',
        propertyId: 'property-1',
        fromUserId: 'tenant-1',
        toUserId: 'owner-1',
        senderName: 'Jane',
        senderEmail: 'jane@example.com',
        senderPhone: '+2340000000',
      },
    ]);
    propertyRepository.find.mockResolvedValue([
      {
        id: 'property-1',
        title: 'Lekki Apartment',
        address: '1 Admiralty Way',
        city: 'Lagos',
        images: [{ url: 'https://img/1.png', isPrimary: true }],
      },
    ]);

    const result = await service.listIncoming('owner-1');

    expect(result).toEqual([
      expect.objectContaining({
        id: 'inq-1',
        property: {
          id: 'property-1',
          title: 'Lekki Apartment',
          address: '1 Admiralty Way',
          city: 'Lagos',
          coverImageUrl: 'https://img/1.png',
        },
        counterparty: {
          id: 'tenant-1',
          name: 'Jane',
          email: 'jane@example.com',
          phone: '+2340000000',
        },
      }),
    ]);
  });

  it('enriches outgoing inquiries with property details and landlord contact', async () => {
    inquiryRepository.find.mockResolvedValue([
      {
        id: 'inq-1',
        propertyId: 'property-1',
        fromUserId: 'tenant-1',
        toUserId: 'owner-1',
      },
    ]);
    propertyRepository.find.mockResolvedValue([
      {
        id: 'property-1',
        title: 'Lekki Apartment',
        address: null,
        city: null,
        images: [],
      },
    ]);
    userRepository.find.mockResolvedValue([
      {
        id: 'owner-1',
        firstName: 'Ada',
        lastName: 'Obi',
        email: 'ada@example.com',
        phoneNumber: null,
      },
    ]);

    const result = await service.listOutgoing('tenant-1');

    expect(result).toEqual([
      expect.objectContaining({
        id: 'inq-1',
        property: {
          id: 'property-1',
          title: 'Lekki Apartment',
          address: null,
          city: null,
          coverImageUrl: null,
        },
        counterparty: {
          id: 'owner-1',
          name: 'Ada Obi',
          email: 'ada@example.com',
          phone: null,
        },
      }),
    ]);
  });
});
