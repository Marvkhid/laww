export default function ContributorsLoading() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16" aria-hidden="true">
      <div className="mb-10">
        <div className="h-3 w-32 animate-pulse bg-digest-red/20" />
        <div className="mt-2 h-8 w-72 animate-pulse bg-hairline" />
      </div>
      <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-12 w-12 animate-pulse bg-hairline" />
            <div className="space-y-2">
              <div className="h-4 w-28 animate-pulse bg-hairline" />
              <div className="h-3 w-20 animate-pulse bg-hairline" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
