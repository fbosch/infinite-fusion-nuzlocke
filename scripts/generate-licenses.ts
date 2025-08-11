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
  licenseText?: string;
  noticeText?: string;
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

    // Attempt to read LICENSE and NOTICE files for each direct dependency
    async function readTextIfExists(filePath: string): Promise<string | undefined> {
      try {
        const content = await fs.readFile(filePath, 'utf8');
        // Normalize newlines
        return content.replace(/\r\n/g, '\n');
      } catch {
        return undefined;
      }
    }

    async function collectLicenseInfo(pkg: LicensePackage): Promise<LicensePackage> {
      const pkgDir = path.join(process.cwd(), 'node_modules', ...pkg.name.split('/'));
      // Common candidate filenames (case-insensitive)
      const licenseCandidates = [
        'LICENSE',
        'LICENSE.txt',
        'LICENSE.md',
        'LICENCE',
        'COPYING',
        'COPYING.txt',
        'COPYING.md',
      ];
      const noticeCandidates = ['NOTICE', 'NOTICE.txt', 'NOTICE.md'];

      // Find first matching file by case-insensitive compare
      async function findCandidate(candidates: string[]): Promise<string | undefined> {
        try {
          const entries = await fs.readdir(pkgDir);
          const lower = entries.reduce<Record<string, string>>((acc, name) => {
            acc[name.toLowerCase()] = name;
            return acc;
          }, {});
          for (const cand of candidates) {
            const match = lower[cand.toLowerCase()];
            if (match) return path.join(pkgDir, match);
          }
          return undefined;
        } catch {
          return undefined;
        }
      }

      const licensePath = await findCandidate(licenseCandidates);
      const noticePath = await findCandidate(noticeCandidates);
      const licenseText = licensePath ? await readTextIfExists(licensePath) : undefined;
      const noticeText = noticePath ? await readTextIfExists(noticePath) : undefined;
      return { ...pkg, licenseText, noticeText };
    }

    const withTexts = await Promise.all(directOnly.map(collectLicenseInfo));

    // Deduplicate by package name (keep first occurrence)
    const dedupedMap = new Map<string, LicensePackage>();
    for (const p of withTexts) {
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

    // Also generate a combined THIRD-PARTY-NOTICES.txt for distribution
    const noticesHeader = `Third-Party Notices\n\nThis file lists open source packages included in this application along with their licenses.\nGenerated: ${output.generatedAt}\n\n`;
    const sections = deduped.map(pkg => {
      const header = `${pkg.name}@${pkg.version} — ${pkg.license}` + (pkg.homepage ? `\nHomepage: ${pkg.homepage}` : '');
      const licenseBlock = pkg.licenseText ? `\n\n----- LICENSE TEXT -----\n${pkg.licenseText.trim()}\n` : '';
      const noticeBlock = pkg.noticeText ? `\n----- NOTICE -----\n${pkg.noticeText.trim()}\n` : '';
      return `${header}${licenseBlock}${noticeBlock}\n`;
    });
    const noticesContent = noticesHeader + sections.join('\n----------------------------------------\n\n');
    const noticesPath = path.join(outDir, 'THIRD-PARTY-NOTICES.txt');
    await fs.writeFile(noticesPath, noticesContent, 'utf8');

    console.log(`Wrote ${deduped.length} entries to ${outPath}`);
  } catch (error) {

    console.error('Failed to generate licenses:', error);
    process.exit(1);
  }
}

generateLicenses();


