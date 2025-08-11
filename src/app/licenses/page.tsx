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
    const mod = await import('../../../public/licenses.json');
    return (mod as { default: unknown }).default as {
      generatedAt: string;
      packages: LicensePackage[];
    };
  } catch {
    // Fallback: if import fails (e.g., file missing), show friendly message
    return null;
  }
}

export const metadata = {
  title: 'Open Source Licenses',
};

export default async function LicensesPage() {
  const data = await loadLicenses();

  return (
    <main className='max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-10'>
      <h1 className='text-2xl font-semibold text-gray-900 dark:text-gray-100'>
        Open Source Licenses
      </h1>
      {!data ? (
        <p className='mt-4 text-gray-700 dark:text-gray-300'>
          License data not found. Generate it with:{' '}
          <code>pnpm licenses:generate</code>.
        </p>
      ) : (
        <>
          <p className='mt-2 text-sm text-gray-600 dark:text-gray-400'>
            Generated at {new Date(data.generatedAt).toLocaleString()}.
          </p>
          <p className='mt-1 text-sm text-gray-600 dark:text-gray-400'>
            Combined notices:{' '}
            <a
              href='/THIRD-PARTY-NOTICES.txt'
              className='text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline'
            >
              THIRD-PARTY-NOTICES.txt
            </a>
          </p>
          <div className='mt-6 overflow-x-auto'>
            <table className='min-w-full text-sm align-top'>
              <thead>
                <tr className='text-left border-b border-gray-200 dark:border-gray-700'>
                  <th className='py-2 pr-4 align-top'>Package</th>
                  <th className='py-2 pr-4 align-top'>Version</th>
                  <th className='py-2 pr-4 align-top'>License</th>
                  <th className='py-2 pr-4 align-top'>Homepage</th>
                  <th className='py-2 pr-4 align-top'>Texts</th>
                </tr>
              </thead>
              <tbody>
                {data.packages.map(pkg => (
                  <tr
                    key={`${pkg.name}@${pkg.version}`}
                    className='border-b border-gray-100 dark:border-gray-800'
                  >
                    <td className='py-2 pr-4 text-gray-900 dark:text-gray-100 align-top'>
                      {pkg.name}
                    </td>
                    <td className='py-2 pr-4 text-gray-700 dark:text-gray-300 align-top'>
                      {pkg.version}
                    </td>
                    <td className='py-2 pr-4 text-gray-700 dark:text-gray-300 align-top'>
                      {pkg.license}
                    </td>
                    <td className='py-2 pr-4 align-top'>
                      {pkg.homepage ? (
                        <a
                          href={pkg.homepage}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline'
                        >
                          {pkg.homepage}
                        </a>
                      ) : (
                        <span className='text-gray-500 dark:text-gray-400'>
                          —
                        </span>
                      )}
                    </td>
                    <td className='py-2 pr-4 align-top'>
                      {pkg.licenseText || pkg.noticeText ? (
                        <details>
                          <summary className='cursor-pointer text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300'>
                            View
                          </summary>
                          {pkg.licenseText && (
                            <div className='mt-2'>
                              <div className='text-xs font-semibold text-gray-900 dark:text-gray-200'>
                                License
                              </div>
                              <pre className='mt-1 whitespace-pre-wrap text-[11px] leading-snug text-gray-700 dark:text-gray-300 max-h-64 overflow-y-auto scrollbar-thin border border-gray-200 dark:border-gray-700 rounded p-2 bg-white dark:bg-gray-900/40'>
                                {pkg.licenseText}
                              </pre>
                            </div>
                          )}
                          {pkg.noticeText && (
                            <div className='mt-3'>
                              <div className='text-xs font-semibold text-gray-900 dark:text-gray-200'>
                                Notice
                              </div>
                              <pre className='mt-1 whitespace-pre-wrap text-[11px] leading-snug text-gray-700 dark:text-gray-300 max-h-64 overflow-y-auto scrollbar-thin border border-gray-200 dark:border-gray-700 rounded p-2 bg-white dark:bg-gray-900/40'>
                                {pkg.noticeText}
                              </pre>
                            </div>
                          )}
                        </details>
                      ) : (
                        <span className='text-gray-500 dark:text-gray-400'>
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
      )}
    </main>
  );
}
