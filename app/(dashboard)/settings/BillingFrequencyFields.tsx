"use client";

import { useState } from "react";
import { Select } from "../../../components/ui";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function BillingFrequencyFields({
  defaultFrequency,
  defaultDayOfWeek,
}: {
  defaultFrequency: string;
  defaultDayOfWeek: number | null;
}) {
  const [frequency, setFrequency] = useState(defaultFrequency);
  const showWeekday = frequency === "weekly" || frequency === "biweekly";

  return (
    <>
      <Select label="Frequency" name="billingFrequency" defaultValue={defaultFrequency} onChange={(e) => setFrequency(e.target.value)}>
        <option value="">Not billed (prepaid only)</option>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="biweekly">Biweekly</option>
        <option value="monthly">Monthly</option>
      </Select>
      {showWeekday && (
        <Select label="Billing day" name="billingDayOfWeek" defaultValue={defaultDayOfWeek ?? ""}>
          <option value="">Choose a day…</option>
          {WEEKDAYS.map((day, i) => (
            <option key={day} value={i}>
              {day}
            </option>
          ))}
        </Select>
      )}
    </>
  );
}
