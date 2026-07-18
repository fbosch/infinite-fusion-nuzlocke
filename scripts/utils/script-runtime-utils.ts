import { ConsoleFormatter } from "./console-utils";

/** Formats an unknown script failure consistently without hiding its message. */
export function formatScriptError(prefix: string, error: unknown): string {
  return `${prefix}: ${error instanceof Error ? error.message : "Unknown error"}`;
}

/** Returns whether a module is being run as the process entrypoint. */
export function isDirectScriptExecution(
  moduleUrl: string,
  entrypoint = process.argv[1],
): boolean {
  return entrypoint !== undefined && moduleUrl === `file://${entrypoint}`;
}

/** Reports a fatal script failure and terminates with the established exit code. */
export function exitOnScriptError(prefix: string, error: unknown): never {
  ConsoleFormatter.error(formatScriptError(prefix, error));
  process.exit(1);
}

/** Starts a script only when its module is the process entrypoint. */
export function runDirectScript(
  moduleUrl: string,
  main: () => Promise<void>,
  entrypoint = process.argv[1],
): void {
  if (isDirectScriptExecution(moduleUrl, entrypoint)) {
    void main();
  }
}
