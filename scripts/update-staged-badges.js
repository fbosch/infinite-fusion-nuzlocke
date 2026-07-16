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
    "pnpm-workspace.yaml",
    "tsconfig.json",
    "vitest.config.ts",
    "src/",
    "scripts/",
    "tests/",
  ]),
);

const generatedBadges = [];
const stashedUnstagedChanges = await stashUnstagedChanges();

try {
  if (shouldUpdateCoverageBadge) {
    await run(["pnpm", "coverage:full"]);
    generatedBadges.push("docs/coverage.svg");
  }

  if (shouldUpdateFallowBadge) {
    await run(["pnpm", "fallow:badge"]);
    generatedBadges.push("docs/fallow.svg");
  }

  if (generatedBadges.length > 0) await run(["git", "add", ...generatedBadges]);
} finally {
  if (stashedUnstagedChanges) await run(["git", "stash", "pop"]);
}

function matchesAny(path, patterns) {
  return patterns.some((pattern) =>
    pattern.endsWith("/") ? path.startsWith(pattern) : path === pattern,
  );
}

async function stashUnstagedChanges() {
  const status = await runOutput(["git", "status", "--porcelain"]);
  const hasUnstagedChanges = status
    .split("\n")
    .filter((line) => line.length > 0)
    .some((line) => line.startsWith("??") || line[1] !== " ");

  if (hasUnstagedChanges === false) return false;

  // Leave the index checked out so badges describe the staged snapshot.
  await run([
    "git",
    "stash",
    "push",
    "--keep-index",
    "--include-untracked",
    "--message",
    "lefthook badge generation",
  ]);
  return true;
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

function runOutput(command) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command[0], command.slice(1), {
      stdio: ["ignore", "pipe", "inherit"],
    });
    let output = "";

    proc.stdout.setEncoding("utf8");
    proc.stdout.on("data", (chunk) => (output += chunk));
    proc.once("close", (exitCode) => {
      if (exitCode === 0) resolve(output);
      else reject(new Error(`${command.join(" ")} exited with ${exitCode}.`));
    });
  });
}
