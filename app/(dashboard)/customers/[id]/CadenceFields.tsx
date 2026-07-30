"use client";

import { useState } from "react";
import { Input, Select } from "../../../../components/ui";

/** Period days only makes sense for a batch drop — hide it for per-day orders. */
export function CadenceFields({ defaultCadence = "per_day" as "per_day" | "batch" }) {
  const [cadence, setCadence] = useState(defaultCadence);
  return (
    <>
      <Select
        label="Cadence"
        name="cadence"
        required
        defaultValue={defaultCadence}
        onChange={(e) => setCadence(e.target.value as "per_day" | "batch")}
      >
        <option value="per_day">Per-day</option>
        <option value="batch">Batch (single drop covering a period)</option>
      </Select>
      {cadence === "batch" && (
        <Input label="Period days" name="periodDays" type="number" defaultValue={7} min={1} hint="How many days of meals this single drop covers" />
      )}
    </>
  );
}
