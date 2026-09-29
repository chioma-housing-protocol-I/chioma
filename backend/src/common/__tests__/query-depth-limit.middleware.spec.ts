import { QueryDepthLimitMiddleware } from '../middleware/query-depth-limit.middleware';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { BadRequestException } from '@nestjs/common';

describe('QueryDepthLimitMiddleware', () => {
  let middleware: QueryDepthLimitMiddleware;
  let configService: ConfigService;

  const createMockConfig = (maxDepth?: string): ConfigService => {
    return {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'QUERY_MAX_DEPTH') {
          return maxDepth;
        }
        return undefined;
      }),
    } as unknown as ConfigService;
  };

  const createNestedObject = (depth: number): any => {
    let obj: any = 'value';
    for (let i = 0; i < depth; i++) {
      obj = { a: obj };
    }
    return obj;
  };

  const createNestedArray = (depth: number): any => {
    let arr: any = 'value';
    for (let i = 0; i < depth; i++) {
      arr = [arr];
    }
    return arr;
  };

  beforeEach(() => {
    configService = createMockConfig();
    middleware = new QueryDepthLimitMiddleware(configService);
  });

  it('should pass through when body and query are empty or simple objects', () => {
    const req = {
      body: { a: 1, b: 'test' },
      query: { x: '1', y: '2' },
    } as unknown as Request;
    const res = {} as Response;
    const next = jest.fn();

    middleware.use(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should pass through when body is exactly at the limit of 10', () => {
    const req = {
      body: createNestedObject(10), // Depth 10
      query: {},
    } as unknown as Request;
    const res = {} as Response;
    const next = jest.fn();

    middleware.use(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should pass through when query is exactly at the limit of 10', () => {
    const req = {
      body: {},
      query: createNestedObject(10), // Depth 10
    } as unknown as Request;
    const res = {} as Response;
    const next = jest.fn();

    middleware.use(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should throw BadRequestException when body is one level over the limit of 10', () => {
    const req = {
      body: createNestedObject(11), // Depth 11
      query: {},
    } as unknown as Request;
    const res = {} as Response;
    const next = jest.fn();

    expect(() => middleware.use(req, res, next)).toThrow(BadRequestException);
    expect(() => middleware.use(req, res, next)).toThrow(
      'Request body depth of 11 exceeds the maximum allowed depth of 10',
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException when query is one level over the limit of 10', () => {
    const req = {
      body: {},
      query: createNestedObject(11), // Depth 11
    } as unknown as Request;
    const res = {} as Response;
    const next = jest.fn();

    expect(() => middleware.use(req, res, next)).toThrow(BadRequestException);
    expect(() => middleware.use(req, res, next)).toThrow(
      'Request query depth of 11 exceeds the maximum allowed depth of 10',
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should support configurable depth limits via ConfigService', () => {
    const customConfig = createMockConfig('3');
    const customMiddleware = new QueryDepthLimitMiddleware(customConfig);

    const reqOk = {
      body: createNestedObject(3),
      query: {},
    } as unknown as Request;
    const nextOk = jest.fn();
    customMiddleware.use(reqOk, {} as Response, nextOk);
    expect(nextOk).toHaveBeenCalledTimes(1);

    const reqFail = {
      body: createNestedObject(4),
      query: {},
    } as unknown as Request;
    const nextFail = jest.fn();
    expect(() =>
      customMiddleware.use(reqFail, {} as Response, nextFail),
    ).toThrow('Request body depth of 4 exceeds the maximum allowed depth of 3');
    expect(nextFail).not.toHaveBeenCalled();
  });

  it('should support arrays and calculate their depth correctly', () => {
    const reqOk = {
      body: createNestedArray(10), // Depth 10
      query: {},
    } as unknown as Request;
    const next = jest.fn();
    middleware.use(reqOk, {} as Response, next);
    expect(next).toHaveBeenCalledTimes(1);

    const reqFail = {
      body: createNestedArray(11), // Depth 11
      query: {},
    } as unknown as Request;
    expect(() => middleware.use(reqFail, {} as Response, jest.fn())).toThrow(
      'Request body depth of 11 exceeds the maximum allowed depth of 10',
    );
  });

  it('should handle circular references gracefully without crashing', () => {
    const circularObj: any = {};
    circularObj.self = circularObj;

    const req = {
      body: circularObj,
      query: {},
    } as unknown as Request;
    const res = {} as Response;
    const next = jest.fn();

    // Since we handle circular references, depth should not cause an infinite loop or error
    expect(() => middleware.use(req, res, next)).not.toThrow();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
