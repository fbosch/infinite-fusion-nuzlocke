import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";

const proc = spawn(
  "pnpm",
  [
    "exec",
    "fallow",
    "health",
    "--coverage-gaps",
    "--format",
    "badge",
    "--quiet",
  ],
  { stdio: ["ignore", "pipe", "pipe"] },
);

const [stdout, stderr, exitCode] = await Promise.all([
  readStream(proc.stdout),
  readStream(proc.stderr),
  new Promise((resolve) => proc.once("close", resolve)),
]);

process.stderr.write(stderr);

const svg = stdout.slice(stdout.indexOf("<svg"));

if (exitCode > 1 || svg.startsWith("<svg") === false) {
  process.stdout.write(stdout);
  throw new Error("Could not read Fallow badge SVG from output.");
}

await mkdir("docs", { recursive: true });
await writeFile("docs/fallow.svg", svg);
console.log("Wrote docs/fallow.svg.");

function readStream(stream) {
  return new Promise((resolve, reject) => {
    let output = "";
    stream.setEncoding("utf8");
    stream.on("data", (chunk) => (output += chunk));
    stream.on("end", () => resolve(output));
    stream.on("error", reject);
  });
}
