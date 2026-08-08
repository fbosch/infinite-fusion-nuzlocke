#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";

const coveragePath = "coverage/coverage-summary.json";
const coverageColors = [
  [90, "#4c1"],
  [80, "#97ca00"],
  [70, "#a4a61d"],
  [60, "#dfb317"],
  [50, "#fe7d37"],
  [0, "#e05d44"],
];
const coverage = JSON.parse(await readFile(coveragePath, "utf8"));
const lineCoverage = coverage.total?.lines?.pct;

if (Number.isFinite(lineCoverage) === false) {
  throw new Error(
    `Could not read aggregate line coverage from ${coveragePath}.`,
  );
}

await mkdir("docs", { recursive: true });
await writeFile(
  "docs/coverage.svg",
  renderBadge(
    "coverage",
    `${lineCoverage.toFixed(2)}%`,
    coverageColor(lineCoverage),
  ),
);

console.log(
  `Wrote docs/coverage.svg (${lineCoverage.toFixed(2)}% line coverage).`,
);

function coverageColor(coveragePercent) {
  return coverageColors.find(([minimum]) => coveragePercent >= minimum)[1];
}

function renderBadge(label, value, valueColor) {
  const labelWidth = textWidth(label);
  const valueWidth = textWidth(value);
  const width = labelWidth + valueWidth;
  const labelCenter = labelWidth / 2;
  const valueCenter = labelWidth + valueWidth / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="${escapeXml(label)}: ${escapeXml(value)}">
  <title>${escapeXml(label)}: ${escapeXml(value)}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${width}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${valueColor}"/>
    <rect width="${width}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text x="${labelCenter}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(label)}</text>
    <text x="${labelCenter}" y="14">${escapeXml(label)}</text>
    <text x="${valueCenter}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(value)}</text>
    <text x="${valueCenter}" y="14">${escapeXml(value)}</text>
  </g>
</svg>
`;
}

function textWidth(text) {
  return text.length * 7 + 10;
}

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
