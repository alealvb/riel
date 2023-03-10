import type { FlatType, Result, InferContext } from "./utils";

export class Riel<
  Context extends Record<string, any> = {},
  InitialContext extends Record<string, any> = Context,
  ErrorContext extends Record<string, any> = {},
  SafeContext extends Record<string, any> = Context
> {
  private steps: Array<{
    run: (...args: any[]) => Record<string, any> | Promise<Record<string, any>>;
    type: "FAIL" | "STEP" | "FAILFAST";
  }> = [];

  step<TAction extends (ctx: FlatType<Context>) => Record<string, any>>(
    action: TAction
  ) {
    this.steps.push({ run: action, type: "STEP" });
    return this as unknown as Riel<
      Context & Awaited<ReturnType<TAction>>,
      InitialContext,
      ErrorContext,
      SafeContext
    >;
  }

  fail<
    TAction extends (
      error: Error,
      errCtx: FlatType<Partial<ErrorContext>>,
      ctx: FlatType<Omit<Partial<Context>, keyof SafeContext> & SafeContext>
    ) => Record<string, any>
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
    ) => Record<string, any>
  >(action: TAction) {
    this.steps.push({ run: action, type: "FAILFAST" });
    return this as unknown as Riel<
      Context,
      InitialContext,
      ErrorContext & Awaited<ReturnType<TAction>>,
      Context
    >;
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
            context = {
              ...context,
              ...stepResult,
            };
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
