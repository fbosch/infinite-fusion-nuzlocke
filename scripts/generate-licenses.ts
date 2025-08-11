#!/usr/bin/env node

import { exec as execCb } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'fs/promises';
import path from 'path';

const exec = promisify(execCb);

type PnpmLicenseEntry = {
  name: string;
  versions: string[];
  paths: string[];
  license: string;
  author?: string | { name?: string };
  homepage?: string;
  description?: string;
};

type PnpmLicensesOutput = Record<string, PnpmLicenseEntry[]>; // license -> entries

type LicensePackage = {
  name: string;
  version: string;
  license: string;
  homepage?: string;
  author?: string;
  description?: string;
};

async function generateLicenses(): Promise<void> {
  try {
    const { stdout } = await exec('pnpm licenses list --prod --json', {
      maxBuffer: 20 * 1024 * 1024,
    });

    const parsed: PnpmLicensesOutput = JSON.parse(stdout);

    const packages: LicensePackage[] = [];

    for (const [license, entries] of Object.entries(parsed)) {
      for (const entry of entries) {
        const authorName =
          typeof entry.author === 'string'
            ? entry.author
            : entry.author?.name || undefined;
        for (const version of entry.versions) {
          packages.push({
            name: entry.name,
            version,
            license,
            homepage: entry.homepage,
            author: authorName,
            description: entry.description,
          });
        }
      }
    }

    // Keep only first-level (direct) non-dev dependencies from package.json
    const pkgJsonPath = path.join(process.cwd(), 'package.json');
    const pkgJsonRaw = await fs.readFile(pkgJsonPath, 'utf8');
    const pkgJson = JSON.parse(pkgJsonRaw) as { dependencies?: Record<string, string> };
    const directDeps = new Set(Object.keys(pkgJson.dependencies || {}));

    // Resolve the installed version for each direct dependency via node_modules
    const installedVersions = new Map<string, string>();
    await Promise.all(
      Array.from(directDeps).map(async dep => {
        try {
          const pkgPath = path.join(process.cwd(), 'node_modules', dep, 'package.json');
          const content = await fs.readFile(pkgPath, 'utf8');
          const parsed = JSON.parse(content) as { version?: string };
          if (parsed.version) installedVersions.set(dep, parsed.version);
        } catch {
          // ignore missing
        }
      })
    );

    // Filter to exact name@version pairs that match installed top-level deps
    const directOnly = packages.filter(p => {
      const v = installedVersions.get(p.name);
      return v && p.version === v;
    });

    // Deduplicate by package name (keep first occurrence)
    const dedupedMap = new Map<string, LicensePackage>();
    for (const p of directOnly) {
      if (!dedupedMap.has(p.name)) dedupedMap.set(p.name, p);
    }
    const deduped = Array.from(dedupedMap.values());

    // Sort for stable output by name
    deduped.sort((a, b) => a.name.localeCompare(b.name));

    const output = {
      generatedAt: new Date().toISOString(),
      packages: deduped,
    };

    const outDir = path.join(process.cwd(), 'public');
    await fs.mkdir(outDir, { recursive: true });
    const outPath = path.join(outDir, 'licenses.json');
    await fs.writeFile(outPath, JSON.stringify(output, null, 2));

    console.log(`Wrote ${deduped.length} entries to ${outPath}`);
  } catch (error) {

    console.error('Failed to generate licenses:', error);
    process.exit(1);
  }
}

generateLicenses();


