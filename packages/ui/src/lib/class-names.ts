export function mergeClassNames(...values: Array<string | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function prependClassName<State>(
  prefix: string,
  className: string | ((state: State) => string | undefined) | undefined,
): string | ((state: State) => string) {
  return typeof className === "function"
    ? (state) => mergeClassNames(prefix, className(state))
    : mergeClassNames(prefix, className);
}
