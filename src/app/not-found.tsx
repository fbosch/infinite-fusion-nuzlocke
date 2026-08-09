import { Home } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex h-svh max-h-[75vh] items-center justify-center p-4">
      <div className="text-center">
        <h1 className="mb-4 font-bold font-mono text-7xl text-gray-400">404</h1>
        <h2 className="mb-2 text-xl">Page Not Found</h2>
        <p className="mb-6 text-gray-600">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          href="/"
        >
          <Home className="h-4 w-4" />
          Go Home
        </Link>
      </div>
    </div>
  );
}
