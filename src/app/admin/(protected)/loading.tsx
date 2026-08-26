export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-hairline">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <p className="font-admin text-lg font-semibold text-ink">Digest Admin</p>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="space-y-4" aria-hidden="true">
          <div className="h-8 w-48 animate-pulse bg-hairline" />
          <div className="h-4 w-32 animate-pulse bg-hairline" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 animate-pulse border border-hairline bg-hairline/20" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
