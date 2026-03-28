#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const README_PATH = path.join(process.cwd(), "README.md");
const BADGE_DOCS_URL = "https://github.com/millionco/react-doctor";

function getBadgeColor(score) {
  if (score >= 90) {
    return "brightgreen";
  }

  if (score >= 75) {
    return "green";
  }

  if (score >= 60) {
    return "yellow";
  }

  if (score >= 40) {
    return "orange";
  }

  return "red";
}

function readReactDoctorScore() {
  const result = spawnSync(
    "pnpm",
    ["dlx", "react-doctor", "--score", "--offline", "--yes"],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  if (result.status !== 0) {
    const details = `${result.stdout}\n${result.stderr}`.trim();
    throw new Error(`react-doctor failed\n${details}`);
  }

  const scoreMatches = result.stdout.match(/\b(?:100|[1-9]?\d)\b/g);
  if (scoreMatches == null || scoreMatches.length === 0) {
    throw new Error(
      `Could not parse react-doctor score from output:\n${result.stdout}`,
    );
  }

  return Number(scoreMatches.at(-1));
}

function upsertBadge(score) {
  const color = getBadgeColor(score);
  const badgeMarkdown = `[![React Doctor](https://img.shields.io/badge/React_Doctor-${score}%2F100-${color})](${BADGE_DOCS_URL})`;

  const content = fs.readFileSync(README_PATH, "utf8");
  const reactDoctorBadgeRegex =
    /\[!\[React Doctor\]\(https:\/\/img\.shields\.io\/badge\/React_Doctor-\d{1,3}%2F100-[a-z]+\)\]\(https:\/\/github\.com\/millionco\/react-doctor\)/;

  let nextContent = content;

  if (reactDoctorBadgeRegex.test(content)) {
    nextContent = content.replace(reactDoctorBadgeRegex, badgeMarkdown);
  } else {
    const reactBadgeRegex = /(\[!\[React\]\([^\n]+\)\]\([^\n]+\))/;
    if (reactBadgeRegex.test(content)) {
      nextContent = content.replace(reactBadgeRegex, `$1\n${badgeMarkdown}`);
    } else {
      nextContent = `${content.trimEnd()}\n\n${badgeMarkdown}\n`;
    }
  }

  if (nextContent !== content) {
    fs.writeFileSync(README_PATH, nextContent);
  }

  return badgeMarkdown;
}

function main() {
  const score = readReactDoctorScore();
  const badge = upsertBadge(score);

  console.log(`React Doctor score: ${score}/100`);
  console.log(`README badge updated: ${badge}`);
}

main();
