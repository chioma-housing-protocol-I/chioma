import { Controller, Get } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { CacheControl } from './cache-control.decorator';

@Controller('cache-control-test')
class CacheControlTestController {
  @Get('public')
  @CacheControl.public(60)
  getPublic() {
    return { ok: true };
  }

  @Get('private')
  @CacheControl.private(30)
  getPrivate() {
    return { ok: true };
  }

  @Get('no-store')
  @CacheControl.noStore()
  getNoStore() {
    return { ok: true };
  }
}

describe('CacheControl decorator', () => {
  let app: any;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [CacheControlTestController],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('sets a public, max-age Cache-Control header', async () => {
    const res = await request(app.getHttpServer()).get(
      '/cache-control-test/public',
    );
    expect(res.headers['cache-control']).toBe('public, max-age=60');
  });

  it('sets a private, max-age Cache-Control header', async () => {
    const res = await request(app.getHttpServer()).get(
      '/cache-control-test/private',
    );
    expect(res.headers['cache-control']).toBe('private, max-age=30');
  });

  it('sets a no-store Cache-Control header', async () => {
    const res = await request(app.getHttpServer()).get(
      '/cache-control-test/no-store',
    );
    expect(res.headers['cache-control']).toBe('no-store');
  });
});
