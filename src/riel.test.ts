import { Riel, riel } from "./riel";

describe("riel", () => {
  it("should return a Riel instance", () => {
    const r = riel();
    expect(r).toBeInstanceOf(Riel);
  });

  it("should return a Riel instance with context", () => {
    const r = riel<{ foo: string }>();
    expect(r).toBeInstanceOf(Riel);
  });
});

describe("Riel", () => {
  describe("#step", () => {
    it("should return a Riel instance", () => {
      const r = riel().step(() => ({}));
      expect(r).toBeInstanceOf(Riel);
    });

    it("should return the same Riel instance", () => {
      const r = riel();
      expect(r.step(() => ({}))).toBe(r);
    });

    it("should have access to the initial context", async () => {
      await riel<{ foo: string }>()
        .step((ctx) => {
          expect(ctx.foo).toBe("bar");
          return {};
        })
        .run({ foo: "bar" });
    });

    it("should have access to the previous context", async () => {
      await riel<{ foo: string }>()
        .step((ctx) => {
          expect(ctx.foo).toBe("bar");
          return { foo: "baz" };
        })
        .step((ctx) => {
          expect(ctx.foo).toBe("bar");
          expect(ctx.foo).toBe("baz");
          return {};
        })
        .run({ foo: "bar" });
    });

    it("should be able to safely modify the context", async () => {
      await riel<{ foo: string }>()
        .step(() => {
          return { foo: "baz" };
        })
        .step((ctx) => {
          expect(ctx.foo).toBe("baz");
          return {};
        })
        .run({ foo: "bar" });
    });

    it("should be able to safely modify the context with a promise", async () => {
      await riel<{ foo: string }>()
        .step(() => {
          return Promise.resolve({ foo: "baz" });
        })
        .step((ctx) => {
          expect(ctx.foo).toBe("baz");
          return {};
        })
        .run({ foo: "bar" });
    });

    it("should be able to return void", async () => {
      await riel<{ foo: string }>()
        .step(() => {
          return;
        })
        .step((ctx) => {
          expect(ctx.foo).toBe("bar");
        })
        .run({ foo: "bar" });
    });
  });

  describe("#fail", () => {
    it("should return a Riel instance", () => {
      const r = riel().fail(() => ({}));
      expect(r).toBeInstanceOf(Riel);
    });

    it("should return the same Riel instance", () => {
      const r = riel();
      expect(r.fail(() => ({}))).toBe(r);
    });

    it("should have access to the initial context", async () => {
      await riel<{ foo: string }>()
        .fail((error, errorCtx, ctx) => {
          expect(ctx.foo).toBe("bar");
          return {};
        })
        .run({ foo: "bar" });
    });

    it("should have access to the previous context", async () => {
      await riel<{ foo: string }>()
        .fail((error, errorCtx, ctx) => {
          expect(ctx.foo).toBe("bar");
          return { foo: "baz" };
        })
        .fail((error, errorCtx, ctx) => {
          expect(ctx.foo).toBe("bar");
          expect(ctx.foo).toBe("baz");
          return {};
        })
        .run({ foo: "bar" });
    });

    it("should have access to the error object", async () => {
      await riel<{ foo: string }>()
        .step(() => {
          throw new Error("foo");
          return {};
        })
        .fail((error, errorCtx, ctx) => {
          expect(error.message).toBe("foo");
          return {};
        })
        .run({ foo: "bar" });
    });

    it("should have access to the initial error context", async () => {
      await riel()
        .step(() => {
          throw new Error("foo");
          return {};
        })
        .fail((error, errorCtx, ctx) => {
          expect(errorCtx).toEqual({});
          return {};
        })
        .run({});
    });

    it("should have access to the previous error context", async () => {
      await riel()
        .step(() => {
          throw new Error("foo");
          return {};
        })
        .fail((error, errorCtx, ctx) => {
          expect(errorCtx).toEqual({});
          return { foo: "bar" };
        })
        .fail((error, errorCtx, ctx) => {
          expect(errorCtx).toEqual({ foo: "bar" });
          return {};
        })
        .run({});
    });

    it("should be able to return void", async () => {
      await riel<{ foo: string }>()
        .step(() => {
          throw new Error("foo");
          return {};
        })
        .fail((error, errorCtx, ctx) => {
          return;
        })
        .fail((error, errorCtx, ctx) => {
          expect(error.message).toBe("foo");
          return;
        })
        .run({ foo: "bar" });
    });
  });

  describe("#failFast", () => {
    it("should return a Riel instance", () => {
      const r = riel().failFast(() => ({}));
      expect(r).toBeInstanceOf(Riel);
    });

    it("should return the same Riel instance", () => {
      const r = riel();
      expect(r.failFast(() => ({}))).toBe(r);
    });

    it("should have access to the error object", async () => {
      await riel<{ foo: string }>()
        .step(() => {
          throw new Error("foo");
          return {};
        })
        .failFast((error, errorCtx, ctx) => {
          expect(error.message).toBe("foo");
          return {};
        })
        .run({ foo: "bar" });
    });

    it("should have access to the initial error context", async () => {
      await riel()
        .step(() => {
          throw new Error("foo");
          return {};
        })
        .failFast((error, errorCtx, ctx) => {
          expect(errorCtx).toEqual({});
          return {};
        })
        .run({});
    });

    it("should have access to the previous error context", async () => {
      await riel()
        .step(() => {
          throw new Error("foo");
          return {};
        })
        .fail((error, errorCtx, ctx) => {
          expect(errorCtx).toEqual({});
          return { foo: "bar" };
        })
        .failFast((error, errorCtx, ctx) => {
          expect(errorCtx).toEqual({ foo: "bar" });
          return {};
        })
        .run({});
    });

    it("should stop the steps execution", async () => {
      const shouldNotBeCalled = jest.fn();

      await riel()
        .step(() => {
          throw new Error("foo");
          return {};
        })
        .failFast((error, errorCtx, ctx) => {
          return {};
        })
        .step(shouldNotBeCalled)
        .run({});

      expect(shouldNotBeCalled).not.toBeCalled();
    });

    it("should stop the fail execution", async () => {
      const shouldNotBeCalled = jest.fn();

      await riel()
        .step(() => {
          throw new Error("foo");
          return {};
        })
        .failFast((error, errorCtx, ctx) => {
          return {};
        })
        .fail(shouldNotBeCalled)
        .run({});

      expect(shouldNotBeCalled).not.toBeCalled();
    });

    it("should stop the failFast execution", async () => {
      const shouldNotBeCalled = jest.fn();

      await riel()
        .step(() => {
          throw new Error("foo");
          return {};
        })
        .failFast((error, errorCtx, ctx) => {
          return {};
        })
        .failFast(shouldNotBeCalled)
        .run({});

      expect(shouldNotBeCalled).not.toBeCalled();
    });

    it("should be able to safely modify the error context", async () => {
      const result = await riel<{ foo: string }>()
        .step(() => {
          throw new Error("foo");
          return {};
        })
        .fail((error, errorCtx, ctx) => {
          return { failError: "baz" };
        })
        .failFast((error, errorCtx, ctx) => {
          return { failFastError: "bar" };
        })
        .run({ foo: "bar" });

      expect((result as any).error.errorCtx).toEqual({
        failError: "baz",
        failFastError: "bar",
      });
    });

    it("should be able to return void", async () => {
      const result = await riel<{ foo: string }>()
        .step(() => {
          throw new Error("foo");
        })
        .failFast((error, errorCtx, ctx) => {
          expect(error.message).toBe("foo");
          return;
        })
        .run({ foo: "bar" });

      expect(result.ok).toBe(false);
      expect((result as any).error.errorCtx).toEqual({});
    });
  });

  describe("#run", () => {
    it("should return a Result shaped object", async () => {
      const result = await riel().run({});
      expect(result).toEqual({
        ok: true,
        value: {
          ctx: {},
        },
      });
    });

    it("should return a Result shaped object with the context", async () => {
      const result = await riel<{ foo: string }>().run({ foo: "bar" });
      expect(result).toEqual({
        ok: true,
        value: {
          ctx: { foo: "bar" },
        },
      });
    });

    it("should return a Result shaped object with the error context", async () => {
      const result = await riel()
        .step(() => {
          throw new Error("foo");
          return {};
        })
        .fail((error, errorCtx, ctx) => {
          return { foo: "bar" };
        })
        .run({});
      expect(result).toMatchObject({
        ok: false,
        error: {
          errorCtx: { foo: "bar" },
        },
      });
    });
  });

  describe("#toStep", () => {
    it("should return a step function", () => {
      const step = riel().toStep();
      expect(typeof step).toBe("function");
    });

    it("should return a step function that returns a Result shaped object", async () => {
      const step = riel().toStep();
      const result = await step({});
      expect(result).toEqual({
        __rielResult: true,
        ok: true,
        value: {
          ctx: {},
        },
      });
    });

    it("should be chainable with other steps", async () => {
      const subOperation = riel()
        .step(() => ({ foo: "bar" }))
        .step((ctx) => ({ baz: "bar" }));

      await riel()
        .step(subOperation.toStep())
        .step((ctx) => {
          expect(ctx).toEqual({ foo: "bar", baz: "bar" });
          return {};
        })
        .run({});
    });

    it("should be chainable with other steps and fail", async () => {
      const subOperation = riel().step((ctx) => {
        throw new Error("foo");
        return {};
      });

      await riel()
        .step(subOperation.toStep())
        .fail((error, errorCtx, ctx) => {
          expect(error.message).toBe("foo");
          return {};
        })
        .run({});
    });

    it("should be chainable with other steps and have access to the error context", async () => {
      const subOperation = riel()
        .step((ctx) => {
          throw new Error("foo");
          return {};
        })
        .fail((error, errorCtx, ctx) => {
          return { foo: "bar" };
        });

      await riel()
        .step(subOperation.toStep())
        .fail((error, errorCtx, ctx) => {
          expect(error.message).toBe("foo");
          expect(errorCtx).toEqual({ foo: "bar" });
          return {};
        })
        .run({});
    });
  });
});
