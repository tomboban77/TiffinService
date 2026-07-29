import { test } from "./support/fixtures";

// Deliberately deferred, not forgotten — see docs/BUILD_SPEC.md milestone 4
// ("points renewals"). While building the rest of this suite we found
// burnPoints/applyRenewal (lib/billing/points.ts) are unit-tested but never
// called from markDelivered — marking a prepaid customer's stop delivered
// today burns zero points. The only points UI that exists is the generic
// manual +/- adjustment on the customer page, not a plan-based renewal
// (top-up). Wiring that in is real feature work, not a UI gap, so it's
// scoped to milestone 4 rather than bolted on here.
test.fixme(
  "prepaid batch: a 10-meal plan top-up credits points, the Sunday batch aggregates the period, and marking delivered burns points to the right balance and writes ledger rows at plan pricing",
  async () => {},
);
