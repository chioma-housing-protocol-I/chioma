'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
  type QueryKey,
  type MutationFunctionContext,
} from '@tanstack/react-query';
import { cancellationManager, isCancellationError } from './manager';
import { useCancellationMetricsStore } from '@/store/cancellation-metrics-store';
import type { AppError } from '@/lib/errors/types';

type CancellationState =
  | { status: 'idle' }
  | { status: 'in-flight'; cancelKey: string }
  | { status: 'cancelled' };

export function useCancellableQuery<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey> & {
    cancellationKey: string;
  },
) {
  const { cancellationKey, queryFn, ...rest } = options;
  const [state, setState] = useState<CancellationState>({ status: 'idle' });
  const trackCancellation = useCancellationMetricsStore(
    (s) => s.trackCancellation,
  );
  const signalRef = useRef<AbortSignal | null>(null);

  const wrappedQueryFn = useCallback(async () => {
    const { signal, key } = cancellationManager.createSignal(cancellationKey);
    signalRef.current = signal;
    setState({ status: 'in-flight', cancelKey: key });
    try {
      if (typeof queryFn !== 'function') throw new Error('queryFn required');
      const result = await queryFn({ signal } as never);
      signalRef.current = null;
      setState((prev) =>
        prev.status === 'in-flight' ? { status: 'idle' } : prev,
      );
      return result;
    } catch (error) {
      signalRef.current = null;
      if (isCancellationError(error)) {
        setState({ status: 'cancelled' });
        trackCancellation(cancellationKey);
        throw error;
      }
      setState((prev) =>
        prev.status === 'in-flight' ? { status: 'idle' } : prev,
      );
      throw error;
    }
  }, [cancellationKey, queryFn, trackCancellation]);

  const queryResult = useQuery({
    ...rest,
    queryFn: wrappedQueryFn,
  } as UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>);

  const cancel = useCallback(() => {
    if (state.status === 'in-flight') {
      cancellationManager.cancel(state.cancelKey);
    }
  }, [state]);

  useEffect(() => {
    return () => {
      if (signalRef.current) {
        signalRef.current = null;
      }
    };
  }, []);

  const isCancelled = state.status === 'cancelled';

  return {
    ...queryResult,
    cancel,
    isCancelled,
    cancellationState: state,
    isInFlight: state.status === 'in-flight',
  };
}

export function useCancellableMutation<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(
  options: UseMutationOptions<TData, TError, TVariables, TContext> & {
    cancellationKey: string;
  },
) {
  const { cancellationKey, mutationFn, ...rest } = options;
  const [state, setState] = useState<CancellationState>({ status: 'idle' });
  const trackCancellation = useCancellationMetricsStore(
    (s) => s.trackCancellation,
  );

  const wrappedMutationFn = useCallback(
    async (variables: TVariables, context: MutationFunctionContext) => {
      const { signal } = cancellationManager.createSignal(cancellationKey);
      setState({ status: 'in-flight', cancelKey: cancellationKey });
      try {
        if (typeof mutationFn !== 'function')
          throw new Error('mutationFn required');
        const result = await mutationFn(variables, context);
        setState((prev) =>
          prev.status === 'in-flight' ? { status: 'idle' } : prev,
        );
        return result;
      } catch (error) {
        if (isCancellationError(error)) {
          setState({ status: 'cancelled' });
          trackCancellation(cancellationKey);
          throw error;
        }
        setState((prev) =>
          prev.status === 'in-flight' ? { status: 'idle' } : prev,
        );
        throw error;
      }
    },
    [cancellationKey, mutationFn, trackCancellation],
  );

  const mutationResult = useMutation({
    ...rest,
    mutationFn: wrappedMutationFn,
  });

  const cancel = useCallback(() => {
    if (state.status === 'in-flight') {
      cancellationManager.cancel(cancellationKey);
    }
  }, [state, cancellationKey]);

  return {
    ...mutationResult,
    cancel,
    isCancelled: state.status === 'cancelled',
    cancellationState: state,
    isInFlight: state.status === 'in-flight',
  };
}

export function useCancellableFetch() {
  const [state, setState] = useState<CancellationState>({ status: 'idle' });
  const trackCancellation = useCancellationMetricsStore(
    (s) => s.trackCancellation,
  );

  const execute = useCallback(
    async <T>(
      key: string,
      fetcher: (signal: AbortSignal) => Promise<T>,
    ): Promise<T> => {
      const { signal } = cancellationManager.createSignal(key);
      setState({ status: 'in-flight', cancelKey: key });
      try {
        const result = await fetcher(signal);
        setState((prev) =>
          prev.status === 'in-flight' ? { status: 'idle' } : prev,
        );
        return result;
      } catch (error) {
        if (isCancellationError(error)) {
          setState({ status: 'cancelled' });
          trackCancellation(key);
          throw error;
        }
        setState((prev) =>
          prev.status === 'in-flight' ? { status: 'idle' } : prev,
        );
        throw error;
      }
    },
    [trackCancellation],
  );

  const cancel = useCallback(() => {
    if (state.status === 'in-flight') {
      cancellationManager.cancel(state.cancelKey!);
    }
  }, [state]);

  return {
    execute,
    cancel,
    isCancelled: state.status === 'cancelled',
    cancellationState: state,
    isInFlight: state.status === 'in-flight',
  };
}

export function useCancelOnUnmount(...cancelKeys: string[]) {
  useEffect(() => {
    return () => {
      cancelKeys.forEach((key) => {
        cancellationManager.cancel(key, 'navigation');
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export function useCancelQueriesOnUnmount(
  client: ReturnType<typeof useQueryClient>,
  queryKeys: string[],
) {
  useEffect(() => {
    return () => {
      queryKeys.forEach((key) => {
        cancellationManager.cancel(key, 'navigation');
      });
      client.cancelQueries();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export function useStaleSignal(key: string, generation: number) {
  const generationRef = useRef(generation);

  useEffect(() => {
    generationRef.current = generation;
    return () => {
      cancellationManager.cancel(key, 'stale');
    };
  }, [generation, key]);

  const isStale = useCallback((checkGeneration: number) => {
    return checkGeneration !== generationRef.current;
  }, []);

  return { isStale };
}
