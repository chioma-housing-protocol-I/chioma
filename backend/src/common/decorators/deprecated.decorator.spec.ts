import { ApiOperation } from '@nestjs/swagger';
import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { Deprecated, DEPRECATION_METADATA_KEY } from './deprecated.decorator';

describe('@Deprecated decorator', () => {
  it('attaches the given options under DEPRECATION_METADATA_KEY', () => {
    class Target {
      @Deprecated({
        sunsetDate: '2026-12-31T00:00:00Z',
        migrationGuideUrl: 'https://docs.example.com/migrate',
        replacementEndpoint: '/api/v2/widgets',
        message: 'internal note',
      })
      handler() {}
    }

    const metadata = Reflect.getMetadata(
      DEPRECATION_METADATA_KEY,
      Target.prototype.handler,
    );

    expect(metadata).toEqual({
      sunsetDate: '2026-12-31T00:00:00Z',
      migrationGuideUrl: 'https://docs.example.com/migrate',
      replacementEndpoint: '/api/v2/widgets',
      message: 'internal note',
    });
  });

  it('defaults to an empty options object when none are provided', () => {
    class Target {
      @Deprecated()
      handler() {}
    }

    const metadata = Reflect.getMetadata(
      DEPRECATION_METADATA_KEY,
      Target.prototype.handler,
    );

    expect(metadata).toEqual({});
  });

  it('marks the route as deprecated in the generated Swagger metadata', () => {
    class Target {
      @Deprecated()
      handler() {}
    }

    const apiOperation = Reflect.getMetadata(
      DECORATORS.API_OPERATION,
      Target.prototype.handler,
    );

    expect(apiOperation).toMatchObject({ deprecated: true });
  });

  it('preserves an existing @ApiOperation summary applied before it', () => {
    class Target {
      @ApiOperation({ summary: 'Does a thing' })
      @Deprecated()
      handler() {}
    }

    const apiOperation = Reflect.getMetadata(
      DECORATORS.API_OPERATION,
      Target.prototype.handler,
    );

    expect(apiOperation).toMatchObject({
      summary: 'Does a thing',
      deprecated: true,
    });
  });
});
