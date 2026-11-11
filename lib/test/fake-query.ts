import { vi } from "vitest";

// A stand-in for @tanstack/react-query in unit tests. A hook returns its options, so a test can run
// queryFn or mutationFn directly with the fake Supabase client.
export const queryClient = {
  invalidateQueries: vi.fn(async () => {}),
  cancelQueries: vi.fn(async () => {}),
  refetchQueries: vi.fn(async () => {}),
  removeQueries: vi.fn(),
  setQueryData: vi.fn(),
  setQueriesData: vi.fn(),
  getQueryData: vi.fn(),
  getQueriesData: vi.fn(() => []),
  fetchQuery: vi.fn(async (o: { queryFn?: () => unknown }) => o.queryFn?.()),
  ensureQueryData: vi.fn(async (o: { queryFn?: () => unknown }) => o.queryFn?.()),
  prefetchQuery: vi.fn(async () => {}),
};

export const useQueryClient = () => queryClient;
export const useQuery = <T>(options: T) => options;
export const useMutation = <T>(options: T) => options;
export const useQueries = <T>(options: T) => options;
export const useInfiniteQuery = <T>(options: T) => options;
export const queryOptions = <T>(options: T) => options;
export const keepPreviousData = <T>(data: T) => data;

type QueryOptions = { queryFn?: (ctx: unknown) => unknown; queryKey?: unknown; select?: (d: unknown) => unknown };
type MutationOptions = {
  mutationFn?: (input: unknown) => unknown;
  onMutate?: (input: unknown) => unknown;
  onSuccess?: (data: unknown, input: unknown, ctx: unknown) => unknown;
  onError?: (error: unknown, input: unknown, ctx: unknown) => unknown;
  onSettled?: (data: unknown, error: unknown, input: unknown, ctx: unknown) => unknown;
};

/** Runs a query hook's queryFn, then its select. */
export async function runQuery(hook: unknown): Promise<unknown> {
  const o = hook as QueryOptions;
  const data = await o.queryFn?.({ queryKey: o.queryKey, signal: new AbortController().signal, meta: undefined });
  return o.select ? o.select(data) : data;
}

/** Runs a mutation hook as React Query does: onMutate, mutationFn, then onSuccess or onError, then onSettled. */
export async function runMutation(hook: unknown, input?: unknown): Promise<unknown> {
  const o = hook as MutationOptions;
  const ctx = await o.onMutate?.(input);
  try {
    const data = await o.mutationFn?.(input);
    await o.onSuccess?.(data, input, ctx);
    await o.onSettled?.(data, null, input, ctx);
    return data;
  } catch (error) {
    await o.onError?.(error, input, ctx);
    await o.onSettled?.(undefined, error, input, ctx);
    throw error;
  }
}
