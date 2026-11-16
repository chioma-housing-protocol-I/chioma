import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { FieldFilteringInterceptor } from './field-filtering.interceptor';

describe('FieldFilteringInterceptor (#2055)', () => {
  let interceptor: FieldFilteringInterceptor;

  beforeEach(() => {
    interceptor = new FieldFilteringInterceptor();
  });

  function contextWithQuery(query: Record<string, unknown>): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ query }),
      }),
    } as unknown as ExecutionContext;
  }

  function handlerReturning(body: unknown): CallHandler {
    return { handle: () => of(body) };
  }

  it('passes the response through unchanged when no fields param is present', async () => {
    const context = contextWithQuery({});
    const body = { id: '1', name: 'Alice', email: 'a@example.com' };

    const result$ = interceptor.intercept(context, handlerReturning(body));
    const result = await new Promise((resolve) => result$.subscribe(resolve));

    expect(result).toBe(body);
  });

  it('passes the response through unchanged when fields is an empty string', async () => {
    const context = contextWithQuery({ fields: '' });
    const body = { id: '1', name: 'Alice' };

    const result$ = interceptor.intercept(context, handlerReturning(body));
    const result = await new Promise((resolve) => result$.subscribe(resolve));

    expect(result).toBe(body);
  });

  it('projects a plain object down to the requested fields', async () => {
    const context = contextWithQuery({ fields: 'id,name' });
    const body = { id: '1', name: 'Alice', email: 'a@example.com', age: 30 };

    const result$ = interceptor.intercept(context, handlerReturning(body));
    const result = await new Promise((resolve) => result$.subscribe(resolve));

    expect(result).toEqual({ id: '1', name: 'Alice' });
  });

  it('projects every item in a plain array', async () => {
    const context = contextWithQuery({ fields: 'id,title' });
    const body = [
      { id: '1', title: 'Flat 1', price: 1000 },
      { id: '2', title: 'Flat 2', price: 2000 },
    ];

    const result$ = interceptor.intercept(context, handlerReturning(body));
    const result = await new Promise((resolve) => result$.subscribe(resolve));

    expect(result).toEqual([
      { id: '1', title: 'Flat 1' },
      { id: '2', title: 'Flat 2' },
    ]);
  });

  it('projects data[] inside a pagination envelope and leaves the envelope metadata alone', async () => {
    const context = contextWithQuery({ fields: 'id,title' });
    const body = {
      data: [{ id: '1', title: 'Flat 1', price: 1000 }],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    };

    const result$ = interceptor.intercept(context, handlerReturning(body));
    const result = await new Promise((resolve) => result$.subscribe(resolve));

    expect(result).toEqual({
      data: [{ id: '1', title: 'Flat 1' }],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
  });

  it('tolerates whitespace and trailing commas in the fields param', async () => {
    const context = contextWithQuery({ fields: ' id , name ,,' });
    const body = { id: '1', name: 'Alice', email: 'a@example.com' };

    const result$ = interceptor.intercept(context, handlerReturning(body));
    const result = await new Promise((resolve) => result$.subscribe(resolve));

    expect(result).toEqual({ id: '1', name: 'Alice' });
  });

  it('silently drops a requested field that does not exist on the item', async () => {
    const context = contextWithQuery({ fields: 'id,doesNotExist' });
    const body = { id: '1', name: 'Alice' };

    const result$ = interceptor.intercept(context, handlerReturning(body));
    const result = await new Promise((resolve) => result$.subscribe(resolve));

    expect(result).toEqual({ id: '1' });
  });

  it('leaves a primitive or null response body untouched', async () => {
    const context = contextWithQuery({ fields: 'id' });

    const result$ = interceptor.intercept(context, handlerReturning(null));
    const result = await new Promise((resolve) => result$.subscribe(resolve));

    expect(result).toBeNull();
  });
});
