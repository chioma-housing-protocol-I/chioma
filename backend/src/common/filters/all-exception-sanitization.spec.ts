import {
  ArgumentsHost,
  ArgumentMetadata,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { ErrorCode } from '../errors/error-codes';
import { BaseAppError } from '../errors/base.error';
import { SanitizePipe } from '../pipes/sanitize.pipe';
import { escapeHtml, sanitizeForResponse } from '../utils/escape-html';

const buildArgumentsHost = (
  request: unknown,
  response: unknown,
): ArgumentsHost =>
  ({
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
    getType: () => 'http',
  }) as unknown as ArgumentsHost;

describe('error response sanitization (#2190)', () => {
  let filter: AllExceptionsFilter;
  let response: { status: jest.Mock; json: jest.Mock; setHeader: jest.Mock };
  let request: { url: string; method: string; headers: Record<string, string> };

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
    };
    request = {
      url: '/api/test?q=<script>alert(1)</script>&x=1',
      method: 'POST',
      headers: { 'x-request-id': '<req-id>' },
    };
  });

  function body(): {
    error: {
      code: string;
      message: string | string[];
      details?: unknown;
      path?: string;
      requestId?: string;
    };
  } {
    return response.json.mock.calls[0][0];
  }

  it('escapes validation messages, details, path and request id', () => {
    filter.catch(
      new BadRequestException([
        '<script>alert(1)</script> is invalid',
        'email "bad" & <b>unsafe</b>',
      ]),
      buildArgumentsHost(request, response),
    );

    const payload = body().error;
    expect(payload.message).toEqual([
      '&lt;script&gt;alert(1)&lt;/script&gt; is invalid',
      'email &quot;bad&quot; &amp; &lt;b&gt;unsafe&lt;/b&gt;',
    ]);
    expect(payload.details).toEqual([
      { message: '&lt;script&gt;alert(1)&lt;/script&gt; is invalid' },
      { message: 'email &quot;bad&quot; &amp; &lt;b&gt;unsafe&lt;/b&gt;' },
    ]);
    expect(payload.path).toBe(
      '/api/test?q=&lt;script&gt;alert(1)&lt;/script&gt;&amp;x=1',
    );
    expect(payload.requestId).toBe('&lt;req-id&gt;');
    expect(response.status).toHaveBeenCalledWith(400);
  });

  it('escapes nested custom-error context without changing the envelope', () => {
    const context = {
      field: '<b>name</b>',
      nested: { quoted: "'quoted'", safe: 42 },
      list: ['<img src=x onerror=alert(1)>'],
    };
    const exception = new BaseAppError(
      ErrorCode.VALIDATION_FAILED,
      HttpStatus.BAD_REQUEST,
      '<script>steal()</script>',
      true,
      context,
    );

    filter.catch(exception, buildArgumentsHost(request, response));

    const payload = body().error;
    expect(payload.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(payload.message).toBe('&lt;script&gt;steal()&lt;/script&gt;');
    expect(payload.details).toEqual({
      field: '&lt;b&gt;name&lt;/b&gt;',
      nested: { quoted: '&#039;quoted&#039;', safe: 42 },
      list: ['&lt;img src=x onerror=alert(1)&gt;'],
    });
    expect(Object.keys(payload).sort()).toEqual([
      'code',
      'details',
      'message',
      'path',
      'requestId',
      'timestamp',
    ]);
    // The caller's object is not mutated.
    expect(context.field).toBe('<b>name</b>');
  });

  it('bounds recursion and replaces cycles with safe placeholders', () => {
    expect(escapeHtml(`<a href="x">&</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;',
    );

    const cyclic: Record<string, unknown> = { name: '<b>x</b>' };
    cyclic.self = cyclic;
    expect(sanitizeForResponse(cyclic)).toEqual({
      name: '&lt;b&gt;x&lt;/b&gt;',
      self: '[circular]',
    });

    let deep: unknown = '<b>deep</b>';
    for (let i = 0; i < 12; i += 1) {
      deep = { next: deep };
    }
    const result = JSON.stringify(sanitizeForResponse(deep));
    expect(result).not.toContain('<b>');
    expect(result).toContain('[truncated]');
  });

  it('keeps the sanitize pipe on the shared escaping implementation', () => {
    const pipe = new SanitizePipe();
    const metadata = { type: 'body', metatype: String } as ArgumentMetadata;

    expect(pipe.transform('<b>hello</b>', metadata)).toBe(
      '&lt;b&gt;hello&lt;/b&gt;',
    );
  });
});
