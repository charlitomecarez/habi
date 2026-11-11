// A stand-in for lib/supabase in unit tests. Each call is recorded as [method, ...args].
// Each awaited chain takes the next queued result, or { data: [], error: null } when the queue is empty.
type Result = { data?: unknown; error?: unknown; count?: number | null };

export const calls: unknown[][] = [];
const queue: Result[] = [];

export function respond(...results: Result[]): void {
  queue.push(...results);
}

export function resetSupabase(): void {
  calls.length = 0;
  queue.length = 0;
}

/** The names passed to from(), rpc() and invoke(), in call order. */
export function targets(): string[] {
  return calls.filter((c) => c[0] === "from" || c[0] === "rpc" || c[0] === "invoke").map((c) => String(c[1]));
}

/** The arguments of each call to one method, for example "insert" or "eq". */
export function argsOf(method: string): unknown[][] {
  return calls.filter((c) => c[0] === method).map((c) => c.slice(1));
}

function settle(): Promise<Result> {
  const next = queue.shift() ?? {};
  return Promise.resolve({ data: [], error: null, count: null, ...next });
}

function node(): unknown {
  const target = function () {} as unknown as object;
  const proxy: unknown = new Proxy(target, {
    get(_t, prop) {
      if (prop === "then")
        return (ok: (v: Result) => unknown, fail: (e: unknown) => unknown) => settle().then(ok, fail);
      if (typeof prop === "symbol") return undefined;
      return new Proxy(function () {} as unknown as object, {
        apply(_f, _this, args: unknown[]) {
          calls.push([prop, ...args]);
          return node();
        },
        get(_f, inner) {
          return (node() as Record<string | symbol, unknown>)[inner];
        },
      });
    },
  });
  return proxy;
}

export const supabase = node() as never;
