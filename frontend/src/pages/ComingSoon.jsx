export default function ComingSoon({ title }) {
  return (
    <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-center">
      <div className="w-10 h-10 rounded-full bg-[var(--surface-3)] mb-4" />
      <h2 className="font-[var(--font-display)] text-[18px] font-medium mb-1.5">{title}</h2>
      <p className="text-[13px] text-[var(--ink-text-muted)] max-w-[260px]">
        This module is next up in the build. Not wired yet.
      </p>
    </div>
  )
}
