export type Merge<Object1, Object2> = Omit<Object1, keyof Object2> & Object2;

export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export type FlatType<T> = T extends Record<PropertyKey, any>
  ? { [K in keyof T]: FlatType<T[K]> }
  : T;

export type InferContext<T> = T extends (ctx: infer TCtx) => Record<string, any>
  ? FlatType<Omit<TCtx, keyof Awaited<ReturnType<T>>> & Awaited<ReturnType<T>>>
  : T extends Record<string, any>
  ? T
  : T extends Promise<Record<string, any>>
  ? Awaited<T>
  : never;

export type StepReturn = Record<string, any> | Promise<Record<string, any> | void> | void