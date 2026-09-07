// Gold count pill for unread/update counts.
export function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="inline-flex min-w-5 items-center justify-center bg-gold px-1.5 text-[11px] font-semibold leading-5 text-white">
      {count}
    </span>
  );
}
