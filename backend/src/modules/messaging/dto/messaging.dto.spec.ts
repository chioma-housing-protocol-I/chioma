import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateRoomDto } from './create-room.dto';
import { UserIdQueryDto } from './user-id-query.dto';
import { RoomIdParamsDto } from './room-id-params.dto';
import { PaginationQueryDto, MESSAGING_LIST_MAX_LIMIT } from './pagination.dto';
import { SendMessageDto, MESSAGE_CONTENT_MAX_LENGTH } from './send-message.dto';

async function errorsFor<T extends object>(
  cls: new () => T,
  input: unknown,
): Promise<number> {
  const dto = plainToInstance(cls, input);
  const errors = await validate(dto as object);
  return errors.length;
}

describe('CreateRoomDto', () => {
  it('accepts numeric-string ids', async () => {
    expect(
      await errorsFor(CreateRoomDto, { userId: '1', participantId: '2' }),
    ).toBe(0);
  });

  it('rejects missing fields', async () => {
    expect(await errorsFor(CreateRoomDto, {})).toBeGreaterThan(0);
  });

  it('rejects non-numeric ids', async () => {
    expect(
      await errorsFor(CreateRoomDto, {
        userId: 'not-a-number',
        participantId: '2',
      }),
    ).toBeGreaterThan(0);
  });
});

describe('UserIdQueryDto', () => {
  it('accepts a numeric-string userId', async () => {
    expect(await errorsFor(UserIdQueryDto, { userId: '42' })).toBe(0);
  });

  it('rejects a missing userId', async () => {
    expect(await errorsFor(UserIdQueryDto, {})).toBeGreaterThan(0);
  });

  it('rejects a non-numeric userId', async () => {
    expect(await errorsFor(UserIdQueryDto, { userId: 'abc' })).toBeGreaterThan(
      0,
    );
  });
});

describe('RoomIdParamsDto', () => {
  it('accepts a numeric-string roomId', async () => {
    expect(await errorsFor(RoomIdParamsDto, { roomId: '10' })).toBe(0);
  });

  it('rejects a non-numeric roomId', async () => {
    expect(await errorsFor(RoomIdParamsDto, { roomId: 'ten' })).toBeGreaterThan(
      0,
    );
  });
});

describe('PaginationQueryDto', () => {
  it('accepts valid page/limit and coerces them to numbers', async () => {
    const dto = plainToInstance(PaginationQueryDto, { page: '2', limit: '10' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(10);
  });

  it('allows omitting page/limit entirely', async () => {
    expect(await errorsFor(PaginationQueryDto, {})).toBe(0);
  });

  it('rejects a limit above the configured maximum', async () => {
    expect(
      await errorsFor(PaginationQueryDto, {
        limit: MESSAGING_LIST_MAX_LIMIT + 1,
      }),
    ).toBeGreaterThan(0);
  });

  it('rejects a page below 1', async () => {
    expect(await errorsFor(PaginationQueryDto, { page: 0 })).toBeGreaterThan(0);
  });
});

describe('SendMessageDto', () => {
  const valid = {
    chatGroupId: '123e4567-e89b-12d3-a456-426614174000',
    senderId: 1,
    receiverId: 2,
    content: 'hello there',
  };

  it('accepts a well-formed message', async () => {
    expect(await errorsFor(SendMessageDto, valid)).toBe(0);
  });

  it('rejects a non-UUID chatGroupId', async () => {
    expect(
      await errorsFor(SendMessageDto, { ...valid, chatGroupId: 'not-a-uuid' }),
    ).toBeGreaterThan(0);
  });

  it('rejects empty content', async () => {
    expect(
      await errorsFor(SendMessageDto, { ...valid, content: '' }),
    ).toBeGreaterThan(0);
  });

  it('rejects content over the configured max length', async () => {
    expect(
      await errorsFor(SendMessageDto, {
        ...valid,
        content: 'a'.repeat(MESSAGE_CONTENT_MAX_LENGTH + 1),
      }),
    ).toBeGreaterThan(0);
  });

  it('accepts content at exactly the configured max length', async () => {
    expect(
      await errorsFor(SendMessageDto, {
        ...valid,
        content: 'a'.repeat(MESSAGE_CONTENT_MAX_LENGTH),
      }),
    ).toBe(0);
  });

  it('rejects non-numeric senderId/receiverId', async () => {
    expect(
      await errorsFor(SendMessageDto, { ...valid, senderId: 'one' }),
    ).toBeGreaterThan(0);
  });
});
