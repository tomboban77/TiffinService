/** The Kettle brand glyph — a stovetop kettle rendered as a single confident line, not a stock icon. */
export function KettleMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <path
        d="M6 18c0-4.5 3.5-7.5 10-7.5S26 13.5 26 18c0 4.6-3.2 7.5-10 7.5S6 22.6 6 18Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M16 10.5V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M13 7h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M26 17c2.5 0 4-1 4-2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 18c-2.6 0-4.5 1.7-4.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12.5 25.5v1.2M19.5 25.5v1.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
