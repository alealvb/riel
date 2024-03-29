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

export type StepReturn =
  | Record<string, any>
  | Promise<Record<string, any> | void>
  | void;

export class Riel<
  Context extends Record<string, any> = {},
  InitialContext extends Record<string, any> = Context,
  ErrorContext extends Record<string, any> = {},
  SafeContext extends Record<string, any> = Context
> {
  private steps: Array<{
    run: (...args: any[]) => StepReturn;
    type: "FAIL" | "STEP" | "FAILFAST";
  }> = [];

  step<TAction extends (ctx: FlatType<Context>) => StepReturn>(
    action: TAction
  ) {
    this.steps.push({ run: action, type: "STEP" });
    return this as unknown as Riel<
      Context &
        (Awaited<ReturnType<TAction>> extends Result<
          infer CtxSuccess extends Record<string, any>,
          Record<string, any>
        >
          ? CtxSuccess["ctx"]
          : Awaited<ReturnType<TAction>>),
      InitialContext,
      ErrorContext &
        (Awaited<ReturnType<TAction>> extends Result<
          any,
          infer CtxError extends Record<string, any>
        >
          ? CtxError["errorCtx"]
          : {}),
      SafeContext
    >;
  }

  fail<
    TAction extends (
      error: Error,
      errCtx: FlatType<Partial<ErrorContext>>,
      ctx: FlatType<Omit<Partial<Context>, keyof SafeContext> & SafeContext>
    ) => StepReturn
  >(action: TAction) {
    this.steps.push({ run: action, type: "FAIL" });
    return this as unknown as Riel<
      Context,
      InitialContext,
      ErrorContext & Awaited<ReturnType<TAction>>,
      SafeContext
    >;
  }

  failFast<
    TAction extends (
      error: Error,
      errCtx: FlatType<Partial<ErrorContext>>,
      ctx: FlatType<Partial<Context>>
    ) => StepReturn
  >(action: TAction) {
    this.steps.push({ run: action, type: "FAILFAST" });
    return this as unknown as Riel<
      Context,
      InitialContext,
      ErrorContext & Awaited<ReturnType<TAction>>,
      Context
    >;
  }

  toStep() {
    return async (ctx: InitialContext) => {
      const result = await this.run(ctx);

      return { ...result, __rielResult: true };
    };
  }

  async run(
    params: InitialContext
  ): Promise<
    Result<
      { ctx: FlatType<Context> },
      { error: Error; errorCtx: FlatType<Partial<ErrorContext>> }
    >
  > {
    let context = params;
    let errorContext: Partial<ErrorContext> = {};
    let failed = false;
    let error = null;
    let currentStepIndex = 0;
    let end = false;

    while (true) {
      if (failed) {
        const failIndex = this.getNextFailIndex(currentStepIndex);
        if (failIndex === null) {
          end = true;
          break;
        }

        currentStepIndex = failIndex;
        const step = this.steps[failIndex];
        const stepResult = await step.run(error, errorContext, context);
        if (stepResult) {
          errorContext = {
            ...errorContext,
            ...stepResult,
          };
        }

        if (step.type === "FAILFAST") {
          break;
        }
      } else {
        const stepIndex = this.getNextStepIndex(currentStepIndex);
        if (stepIndex === null) {
          end = true;
          break;
        }

        currentStepIndex = stepIndex;
        const step = this.steps[stepIndex];
        try {
          const stepResult = await step.run(context);
          if (stepResult) {
            if (stepResult.__rielResult) {
              if (stepResult.ok) {
                context = {
                  ...context,
                  ...stepResult.value.ctx,
                };
              } else {
                failed = true;
                error = stepResult.error.error;
                errorContext = stepResult.error.errorCtx;
              }
            } else {
              context = {
                ...context,
                ...stepResult,
              };
            }
          }
        } catch (err) {
          failed = true;
          error = err;
        }
      }
      currentStepIndex++;
    }

    if (end) {
      if (failed) {
        return {
          ok: false,
          error: {
            error: error as unknown as Error,
            errorCtx: errorContext as FlatType<Partial<ErrorContext>>,
          },
        };
      }

      return {
        ok: true,
        value: {
          ctx: context as unknown as FlatType<Context>,
        },
      };
    }

    if (failed) {
      return {
        ok: false,
        error: {
          error: error as unknown as Error,
          errorCtx: errorContext as FlatType<Partial<ErrorContext>>,
        },
      };
    }

    throw new Error("unreachable");
  }

  private getNextStepIndex(currentStep: number): number | null {
    return this.getNextIndex(currentStep, "STEP");
  }

  private getNextFailIndex(currentStep: number): number | null {
    const failIndex = this.getNextIndex(currentStep, "FAIL");
    const failfastIndex = this.getNextIndex(currentStep, "FAILFAST");
    if (failIndex === null && failfastIndex === null) {
      return null;
    }

    if (failIndex === null) {
      return failfastIndex;
    }

    if (failfastIndex === null) {
      return failIndex;
    }

    return Math.min(failIndex, failfastIndex);
  }

  private getNextIndex(
    currentStep: number,
    type: "STEP" | "FAIL" | "FAILFAST"
  ) {
    for (let i = currentStep; i < this.steps.length; i++) {
      const step = this.steps[i];
      if (step.type === type) {
        return i;
      }
    }
    return null;
  }
}

export function riel<Context extends Record<string, any> = {}>() {
  return new Riel<Context>();
}
