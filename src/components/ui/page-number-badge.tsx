export function PageNumberBadge({ page }: { page: number }) {
  return (
    <span className="inline-flex h-9 min-w-9 items-center justify-center bg-digest-red px-1.5 font-utility text-sm font-medium text-paper">
      {page}
    </span>
  );
}
