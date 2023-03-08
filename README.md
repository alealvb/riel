# Riel

`Riel` is a `typesafe` logic buildedr that allows you to define a sequence of steps to execute, with the ability to handle failures and errors.

## Not production ready ~~yet~~
Please note that the Riel library is still in an experimental phase and should not be used in production environments until it has been thoroughly tested and stabilized. While we strive to provide a high-quality and reliable library, there may still be issues and bugs that need to be addressed.

In addition, the API and behavior of Riel may change as we receive feedback from the community and continue to improve the library. We recommend using Riel in experimental or personal projects for now, and waiting until a stable release before using it in production environments.

If you encounter any issues or have suggestions for how we can improve Riel, please don't hesitate to open an issue or a pull request on our GitHub repository. We appreciate any feedback and contributions to help make Riel a better library for everyone.

## Installation

To use Riel, first install it with npm:

```bash
    npm install riel #or yarn add riel
```

Then import it into your project:

```typescript
import Riel from "riel";
```

## Usage

To use `Riel`, you need to create an instance of the class and then define the steps using the step, and fail methods. Here's an example:

```typescript
const riel = new Riel()
  .step((ctx) => ({ a: 1 }))
  .step((ctx) => ({ b: 2 }))
  .fail((err, errCtx, ctx) => ({ c: 3 }));
```

The `step` method takes a function that receives the context and returns a new context.

The `fail` method takes a function that receives the error, the error context, and the context.

The `fail` method is optional, and if not defined, the error will be thrown.

To execute the steps, you need to call the `run` method, which returns a promise that resolves to a Result object that contains the full context if the operation was successful or the error and error context if it failed.

```typescript
const result = await riel.run({});
if (result.ok) {
  console.log(result.value.ctx); // Output: { a: 1, b: 2 }
} else {
  console.log(result.error.error); // Output: An Error object
  console.log(result.error.errorCtx); // Output: { c: 3 }
}
```

`Riel` also supports async steps and errors:

```typescript
const riel = new Riel()
  .step(async (ctx) => ({ a: 1 }))
  .fail(async (err, errCtx, ctx) => ({ c: 2 }));
```

You can also insert the initial context directly into the `run` method, this can be useful if you want to use the same `Riel` instance multiple times, for example in a controller:

```typescript
// we can define the initial context type
const riel = new Riel<{ userId: number }>()
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

## Why Riel?
`Riel` is a lightweight library that provides a way to orchestrate complex workflows in a modular, testable, and extensible manner. It can be used to build multi-step processes that involve asynchronous operations, error handling, and context management.

There are many use cases where Riel can be helpful. For example:

- Controllers: If you need to build a controller that performs multiple operations and handles errors, you can use Riel to manage the logic.

- API requests: If you need to make a series of requests to an API, and each request depends on the response from the previous request, you can use Riel to orchestrate this process.

- Batch processing: If you need to process a large amount of data in batches, and each batch depends on the result of the previous batch, you can use Riel to manage this process.

- Transaction management: If you need to perform a series of database operations as part of a transaction, and you want to rollback the entire transaction if any of the operations fail, you can use Riel to handle this logic.

-  Automated testing: If you want to test a complex workflow that involves multiple steps and edge cases, you can use Riel to set up and execute the test case.

`Riel` is designed to be flexible and customizable, so you can adapt it to your specific use case. It also supports a range of generic types, allowing you to specify the context, error handling, and safe context types that are relevant to your workflow.