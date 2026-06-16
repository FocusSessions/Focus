import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <p className="text-7xl font-serif font-bold text-terracotta/20">404</p>
        <h1 className="mt-4 font-serif text-2xl text-brown">Page not found</h1>
        <p className="mt-2 text-sm text-brown-muted">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link href="/" className="btn-primary mt-6 inline-flex">
          Go Home
        </Link>
      </div>
    </div>
  );
}
