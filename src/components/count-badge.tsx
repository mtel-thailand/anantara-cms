export default function CountBadge({ count }: { count: number }) {
  return (
    <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-primary px-1 text-[11px] font-semibold tabular-nums text-primary-foreground">
      {count}
    </span>
  );
}
