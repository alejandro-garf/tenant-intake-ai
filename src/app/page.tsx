import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-large-title mb-4">Tenant Portal</h1>
        <p className="text-body text-secondary-label mb-8">
          CTCAC / LIHTC tenant screening portal
        </p>
        <Link
          href="/showcase"
          className="inline-flex items-center justify-center rounded-pill bg-system-blue text-white px-6 py-3 text-body font-semibold transition-ios hover:opacity-80"
        >
          View Component Showcase
        </Link>
      </div>
    </div>
  );
}
