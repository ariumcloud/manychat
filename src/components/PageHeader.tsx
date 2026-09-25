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
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_78%,transparent)] px-6 py-3.5 backdrop-blur-xl">
      <div className="min-w-0">
        <h1 className="text-[17px] font-semibold leading-tight tracking-[-0.01em]">{title}</h1>
        {subtitle && <p className="mt-0.5 truncate text-xs text-[var(--fg-muted)]">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
