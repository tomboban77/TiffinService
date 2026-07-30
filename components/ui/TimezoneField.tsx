/**
 * A searchable timezone field with zero client JS: <input list> + <datalist>
 * gives native, accessible type-to-filter behavior in every real browser.
 * Server-safe — Intl.supportedValuesOf runs once at render time.
 */
export function TimezoneField({ defaultValue, name = "timezone" }: { defaultValue: string; name?: string }) {
  const zones = Intl.supportedValuesOf("timeZone");
  const listId = `${name}-options`;
  return (
    <label htmlFor={name} className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-ink">Timezone</span>
      <input
        id={name}
        name={name}
        list={listId}
        defaultValue={defaultValue}
        required
        autoComplete="off"
        placeholder="Start typing a city or region…"
        className="min-h-[44px] rounded-control border border-line-strong px-3 py-2 text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-accent-500"
      />
      <datalist id={listId}>
        {zones.map((zone) => (
          <option key={zone} value={zone} />
        ))}
      </datalist>
    </label>
  );
}
