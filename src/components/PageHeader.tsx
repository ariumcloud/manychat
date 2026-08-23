export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_78%,transparent)] px-8 py-5 backdrop-blur-xl">
      <div className="min-w-0">
        <h1 className="text-[19px] font-semibold leading-tight tracking-[-0.01em]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[var(--fg-muted)]">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
