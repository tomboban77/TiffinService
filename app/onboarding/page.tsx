import { Card, Input, SubmitButton, TimezoneField } from "../../components/ui";
import { createOperatorAction } from "./actions";

export default function OnboardingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-paper px-4 py-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold text-ink">Set up your kitchen</h1>
          <p className="mt-1 text-sm text-ink-muted">
            A minimal bootstrap for now — the full setup wizard (presets, price list, cutoffs, WhatsApp connect) lands
            in a later milestone. You can change everything below in Settings afterward.
          </p>
        </div>

        <Card>
          <form action={createOperatorAction} className="flex flex-col gap-4">
            <Input label="Business name" name="businessName" required />
            <Input label="Your name" name="ownerName" required />
            <TimezoneField defaultValue="America/Toronto" />
            <SubmitButton className="mt-1">Continue</SubmitButton>
          </form>
        </Card>
      </div>
    </main>
  );
}
