export default function IssuesLoading() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16" aria-hidden="true">
      <div className="mb-10">
        <div className="h-3 w-24 animate-pulse bg-digest-red/20" />
        <div className="mt-2 h-8 w-48 animate-pulse bg-hairline" />
      </div>
      <div className="grid gap-8 md:grid-cols-[200px_1fr] md:items-center">
        <div className="aspect-[3/4] w-full max-w-[200px] animate-pulse bg-hairline/40" />
        <div className="space-y-3">
          <div className="h-3 w-24 animate-pulse bg-digest-red/20" />
          <div className="h-8 w-48 animate-pulse bg-hairline" />
          <div className="h-4 w-32 animate-pulse bg-hairline" />
        </div>
      </div>
    </div>
  );
}
