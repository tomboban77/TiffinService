"use client";

import { useState } from "react";
import { Input } from "../../../components/ui";

function slugify(label: string): string {
  return (
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "slot"
  );
}

/** The operator names a slot; the "key" it's stored under (a dev concept) is derived automatically. */
export function SlotLabelField() {
  const [label, setLabel] = useState("");
  return (
    <>
      <Input label="Label" name="label" placeholder="e.g. Dinner" required value={label} onChange={(e) => setLabel(e.target.value)} />
      <input type="hidden" name="key" value={slugify(label)} />
    </>
  );
}
