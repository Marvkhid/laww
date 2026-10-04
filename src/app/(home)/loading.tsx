export default function HomeLoading() {
  return (
    <div className="min-h-screen">
      {/* Breaking news skeleton */}
      <section className="border-b border-hairline bg-paper">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <div className="h-3 w-40 animate-pulse bg-digest-red/20" />
          <div className="mt-3 space-y-3" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-4 w-2/3 animate-pulse bg-hairline" />
            ))}
          </div>
        </div>
      </section>

      {/* Hero skeleton */}
      <section className="border-b border-hairline">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 md:grid-cols-2 md:items-center">
          <div className="space-y-4" aria-hidden="true">
            <div className="h-3 w-48 animate-pulse bg-digest-red/20" />
            <div className="h-10 w-3/4 animate-pulse bg-hairline" />
            <div className="h-4 w-1/2 animate-pulse bg-hairline" />
            <div className="h-16 w-full max-w-md animate-pulse bg-digest-red/10" />
          </div>
          <div className="relative mx-auto aspect-[3/4] w-full max-w-sm animate-pulse bg-hairline" />
        </div>
      </section>

      {/* Section skeletons */}
      {[0, 1, 2].map((i) => (
        <section key={i} className="border-t border-hairline">
          <div className="mx-auto max-w-6xl px-6 py-16" aria-hidden="true">
            <div className="h-3 w-32 animate-pulse bg-digest-red/20" />
            <div className="mt-2 h-8 w-64 animate-pulse bg-hairline" />
            <div className="mt-8 grid gap-8 md:grid-cols-3">
              {[0, 1, 2].map((j) => (
                <div key={j} className="space-y-3">
                  <div className="aspect-[16/10] w-full animate-pulse bg-hairline/40" />
                  <div className="h-4 w-3/4 animate-pulse bg-hairline" />
                  <div className="h-3 w-1/2 animate-pulse bg-hairline" />
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
