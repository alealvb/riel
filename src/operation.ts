import { Riel } from "./riel";

export function operation<Context extends Record<string, any> = {}>() {
  return new Riel<Context>();
}
