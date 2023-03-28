# Riel

`Riel` is a library for composing and executing a sequence of steps with error handling and context propagation in a `typesafe` way.

## Installation

To use Riel, first install it with npm:

```bash
npm install riel
```

or with yarn:

```bash
yarn add riel
```

Then import it into your project:

```typescript
import { riel } from "riel";
```

## Usage

To use `Riel`, you need to create an instance of the class and then define the steps using the step, and fail methods. Here's an example:

```typescript
const operation = riel()
  .step((ctx) => ({ a: 1 }))
  .step((ctx) => ({ b: 2 }))
  .fail((err, errCtx, ctx) => ({ c: 3 }));
```

The `step` method takes a function that receives the context and might return a new piece of context.

The `fail` method takes a function that receives the error, the error context, and the context.

The `fail` method is optional, and if not defined, the error will be thrown.

To execute the steps, you need to call the `run` method, which returns a promise that resolves to a Result object that contains the full context if the operation was successful or the error and error context if it failed.

```typescript
const result = await operation.run({});
if (result.ok) {
  console.log(result.value.ctx); // Output: { a: 1, b: 2 }
} else {
  console.log(result.error.error); // Output: An Error object
  console.log(result.error.errorCtx); // Output: { c: 3 }
}
```

`Riel` also supports async steps and errors:

```typescript
const operation = riel()
  .step(async (ctx) => ({ a: 1 }))
  .fail(async (err, errCtx, ctx) => ({ c: 2 }));
```

You can also insert the initial context directly into the `run` method, this can be useful if you want to use the same `Riel` instance multiple times, for example in a controller:

```typescript
// we can define the initial context type
const operation = riel<{ userId: number }>()
  .step(async (ctx) => {
    const user = await getUser(ctx.userId);
    return { user };
  })
  .fail((err, errCtx, ctx) => {
    // ... handle the error
    return { message: "user not found" };
  });

const result = await riel.run({ userId: 1 });
```

Sometimes you might want to end the operation early when a step fails. You can do this by usin the method `failFast`, wich acts like a regular `fail` but also stops the execution of the operation.

```typescript
const operation = riel()
  .step((ctx) => throw new Error("error"))
  .failFast((err, errCtx, ctx) => ({ c: 3 }));
  .step((ctx) => ({ e: 5 }));
  .fail((err, errCtx, ctx) => ({ d: 4 }));
```

In this example, the operation will stop after the first step, and the `failFast` callback will be called. The `fail` callback will not be called, and the second step will not be executed.

### Context

The context is an object that is passed from step to step. It can be used to store data that is relevant to the operation. The context can be of any type, and it can be defined when creating the `Riel` instance:

```typescript
const operation = riel<{ userId: number }>()
  .step((ctx) => ({ a: 1 }))
  .step((ctx) => ({ b: 2 }));
```

When you call the `run` method, you can pass the initial context as an argument:

```typescript
const result = await operation.run({ userId: 1 });
```

### Nested operations

You can also use `Riel` to compose operations. This can be useful if you want to reuse a sequence of steps in multiple places. For example, you can define a `Riel` instance that performs for example a series of database operations, and then use this instance in multiple controllers.

To achieve this, you can use the `toStep` method to convert a `Riel` instance to a step function:

```typescript
const persist = riel<{ instance: SomeORMInstance }>()
  .step((ctx) => {
    const instance = await ctx.instance.save();
    return { instance };
  })
  .fail((err, errCtx, ctx) => {
    /* handle persistance error(s)? */
  });

const createUser = riel()
  .step((ctx) => ({ instance: new User() }))
  .step((ctx) => {
    /* perform some validation on the instance? */
  })
  .step(persist.toStep())
  .step((ctx) => {
    // ctx.instance is now a persisted instance of User
  });
```

As you can see, the `toStep` method returns a function that takes the context and returns a new context. This function can be used as a step in another `Riel` instance.

## Why Riel?

`Riel` is a lightweight library that provides a way to orchestrate complex workflows in a modular, testable, and extensible manner. It can be used to build multi-step processes that involve asynchronous operations, error handling, and context management.

There are many use cases where Riel can be helpful. For example:

- Controllers: If you need to build a controller that performs multiple operations and handles errors, you can use Riel to manage the logic.

- API requests: If you need to make a series of requests to an API, and each request depends on the response from the previous request, you can use Riel to orchestrate this process.

- Batch processing: If you need to process a large amount of data in batches, and each batch depends on the result of the previous batch, you can use Riel to manage this process.

- Transaction management: If you need to perform a series of database operations as part of a transaction, and you want to rollback the entire transaction if any of the operations fail, you can use Riel to handle this logic.

- Automated testing: If you want to test a complex workflow that involves multiple steps and edge cases, you can use Riel to set up and execute the test case.

`Riel` is designed to be flexible and customizable, so you can adapt it to your specific use case. It also supports a range of generic types, allowing you to specify the context, error handling, and safe context types that are relevant to your workflow.
