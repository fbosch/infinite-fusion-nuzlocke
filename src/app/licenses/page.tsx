import fs from 'fs/promises';
import path from 'path';

type LicensePackage = {
  name: string;
  version: string;
  license: string;
  homepage?: string;
  author?: string;
  description?: string;
};

async function loadLicenses(): Promise<{
  generatedAt: string;
  packages: LicensePackage[];
} | null> {
  try {
    const filePath = path.join(process.cwd(), 'public', 'licenses.json');
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch {
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
          <div className='mt-6 overflow-x-auto'>
            <table className='min-w-full text-sm'>
              <thead>
                <tr className='text-left border-b border-gray-200 dark:border-gray-700'>
                  <th className='py-2 pr-4'>Package</th>
                  <th className='py-2 pr-4'>Version</th>
                  <th className='py-2 pr-4'>License</th>
                  <th className='py-2 pr-4'>Homepage</th>
                </tr>
              </thead>
              <tbody>
                {data.packages.map(pkg => (
                  <tr
                    key={`${pkg.name}@${pkg.version}`}
                    className='border-b border-gray-100 dark:border-gray-800'
                  >
                    <td className='py-2 pr-4 text-gray-900 dark:text-gray-100'>
                      {pkg.name}
                    </td>
                    <td className='py-2 pr-4 text-gray-700 dark:text-gray-300'>
                      {pkg.version}
                    </td>
                    <td className='py-2 pr-4 text-gray-700 dark:text-gray-300'>
                      {pkg.license}
                    </td>
                    <td className='py-2 pr-4'>
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
