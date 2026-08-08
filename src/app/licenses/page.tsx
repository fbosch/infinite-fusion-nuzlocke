import type { Metadata } from "next";
import Link from "next/link";

// Load license data without relying on filesystem access at runtime

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

async function loadLicenses(): Promise<{
  generatedAt: string;
  packages: LicensePackage[];
} | null> {
  try {
    // Prefer build-time import so it works in Serverless/Edge runtimes
    const mod = await import("../../../public/licenses.json");
    return (mod as { default: unknown }).default as {
      generatedAt: string;
      packages: LicensePackage[];
    };
  } catch {
    // Fallback: if import fails (e.g., file missing), show friendly message
    return null;
  }
}

export const metadata: Metadata = {
  alternates: {
    canonical: "/licenses",
  },
  title: "Open Source Licenses",
};

export default async function LicensesPage() {
  const data = await loadLicenses();

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-semibold text-2xl text-gray-900 dark:text-gray-100">
        Open Source Licenses
      </h1>
      {data ? (
        <>
          <p className="mt-2 text-gray-600 text-sm dark:text-gray-400">
            Generated at {new Date(data.generatedAt).toLocaleString()}.
          </p>
          <p className="mt-1 text-gray-600 text-sm dark:text-gray-400">
            Combined notices:{" "}
            <Link
              className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              href="/THIRD-PARTY-NOTICES.txt"
            >
              THIRD-PARTY-NOTICES.txt
            </Link>
          </p>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full align-top text-sm">
              <thead>
                <tr className="border-gray-200 border-b text-left dark:border-gray-700">
                  <th className="py-2 pr-4 align-top">Package</th>
                  <th className="py-2 pr-4 align-top">Version</th>
                  <th className="py-2 pr-4 align-top">License</th>
                  <th className="py-2 pr-4 align-top">Homepage</th>
                  <th className="py-2 pr-4 align-top">Texts</th>
                </tr>
              </thead>
              <tbody>
                {data.packages.map((pkg) => (
                  <tr
                    className="border-gray-100 border-b dark:border-gray-800"
                    key={`${pkg.name}@${pkg.version}`}
                  >
                    <td className="py-2 pr-4 align-top text-gray-900 dark:text-gray-100">
                      {pkg.name}
                    </td>
                    <td className="py-2 pr-4 align-top text-gray-700 dark:text-gray-300">
                      {pkg.version}
                    </td>
                    <td className="py-2 pr-4 align-top text-gray-700 dark:text-gray-300">
                      {pkg.license}
                    </td>
                    <td className="py-2 pr-4 align-top">
                      {pkg.homepage ? (
                        <a
                          className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          href={pkg.homepage}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          {pkg.homepage}
                        </a>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">
                          —
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4 align-top">
                      {pkg.licenseText || pkg.noticeText ? (
                        <details>
                          <summary className="cursor-pointer text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                            View
                          </summary>
                          {pkg.licenseText && (
                            <div className="mt-2">
                              <div className="font-semibold text-gray-900 text-xs dark:text-gray-200">
                                License
                              </div>
                              <pre className="scrollbar-thin mt-1 max-h-64 overflow-y-auto whitespace-pre-wrap rounded border border-gray-200 bg-white p-2 text-[11px] text-gray-700 leading-snug dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
                                {pkg.licenseText}
                              </pre>
                            </div>
                          )}
                          {pkg.noticeText && (
                            <div className="mt-3">
                              <div className="font-semibold text-gray-900 text-xs dark:text-gray-200">
                                Notice
                              </div>
                              <pre className="scrollbar-thin mt-1 max-h-64 overflow-y-auto whitespace-pre-wrap rounded border border-gray-200 bg-white p-2 text-[11px] text-gray-700 leading-snug dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
                                {pkg.noticeText}
                              </pre>
                            </div>
                          )}
                        </details>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="mt-4 text-gray-700 dark:text-gray-300">
          License data not found. Generate it with:{" "}
          <code>pnpm licenses:generate</code>.
        </p>
      )}
    </main>
  );
}
