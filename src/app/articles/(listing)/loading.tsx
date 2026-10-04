export default function ArticlesLoading() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16" aria-hidden="true">
      <div className="mb-10">
        <div className="h-3 w-24 animate-pulse bg-digest-red/20" />
        <div className="mt-2 h-8 w-64 animate-pulse bg-hairline" />
      </div>
      <div className="divide-y divide-hairline border-y border-hairline">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4 py-4">
            <div className="h-9 min-w-9 animate-pulse bg-digest-red/20" />
            <div className="space-y-2">
              <div className="h-5 w-72 animate-pulse bg-hairline" />
              <div className="h-3 w-40 animate-pulse bg-hairline" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
