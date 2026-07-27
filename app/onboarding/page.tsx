import { createOperatorAction } from "./actions";

export default function OnboardingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-xl font-semibold">Set up your kitchen</h1>
        <p className="mt-1 text-sm text-gray-500">
          A minimal bootstrap for now — the full setup wizard (presets, price list, cutoffs, WhatsApp connect) lands
          in a later milestone. You can change everything below in Settings afterward.
        </p>
      </div>

      <form action={createOperatorAction} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Business name
          <input name="businessName" required className="rounded-md border border-gray-300 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Your name
          <input name="ownerName" required className="rounded-md border border-gray-300 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Timezone (IANA)
          <input name="timezone" defaultValue="America/Toronto" required className="rounded-md border border-gray-300 px-3 py-2" />
        </label>
        <button type="submit" className="mt-2 rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white">
          Continue
        </button>
      </form>
    </main>
  );
}
