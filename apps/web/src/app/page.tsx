import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white px-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-bold tracking-tight text-slate-900 mb-4">
          LeaseKo
        </h1>
        <p className="text-xl text-slate-600 mb-8">
          Multi-tenant Property Management SaaS
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-md bg-slate-900 px-6 py-3 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
          >
            Go to Dashboard
          </Link>
          <a
            href="http://localhost:3001/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            API Docs
          </a>
        </div>
      </div>
    </main>
  );
}
