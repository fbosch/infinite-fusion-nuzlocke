import { spawn } from "node:child_process";
import { isAbsolute, relative } from "node:path";

const stagedPaths = process.argv
  .slice(2)
  .map((path) => (isAbsolute(path) ? relative(process.cwd(), path) : path));

if (stagedPaths.length === 0) process.exit(0);

const shouldUpdateCoverageBadge = stagedPaths.some((path) =>
  matchesAny(path, [
    "package.json",
    "vitest.config.ts",
    "scripts/generate-coverage-badge.js",
    "src/",
    "tests/",
  ]),
);
const shouldUpdateFallowBadge = stagedPaths.some((path) =>
  matchesAny(path, [
    ".fallowrc.jsonc",
    "package.json",
    "scripts/generate-fallow-badge.js",
    "src/",
    "tests/",
  ]),
);

if (shouldUpdateCoverageBadge) await run(["pnpm", "coverage:full"]);
if (shouldUpdateFallowBadge) await run(["pnpm", "fallow:badge"]);
if (shouldUpdateCoverageBadge || shouldUpdateFallowBadge) {
  await run(["git", "add", "docs/coverage.svg", "docs/fallow.svg"]);
}

function matchesAny(path, patterns) {
  return patterns.some((pattern) =>
    pattern.endsWith("/") ? path.startsWith(pattern) : path === pattern,
  );
}

function run(command) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command[0], command.slice(1), { stdio: "inherit" });
    proc.once("close", (exitCode) => {
      if (exitCode === 0) resolve();
      else reject(new Error(`${command.join(" ")} exited with ${exitCode}.`));
    });
  });
}
