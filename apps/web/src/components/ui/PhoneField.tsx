"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  COUNTRIES,
  countryByDial,
  nationalNumberHint,
  DEFAULT_DIAL_CODE,
} from "@lms/types";

type Props = {
  label: string;
  /** Dial code, e.g. "+91". Falls back to India when a lead predates the picker. */
  dial: string;
  onDialChange: (dial: string) => void;
  value: string;
  onValueChange: (national: string) => void;
  required?: boolean;
  disabled?: boolean;
  /** Locks the country select while leaving the number editable... */
  dialDisabled?: boolean;
  /** ...and the reverse, for the edit form where the number is the dedupe key. */
  numberDisabled?: boolean;
  error?: string | undefined;
  helperText?: string | undefined;
};

/**
 * Country dial code + national number, kept as one field because neither half
 * validates without the other. `Input` has no prefix slot, so the two controls
 * are composed here rather than bending the shared component out of shape.
 */
export function PhoneField({
  label,
  dial,
  onDialChange,
  value,
  onValueChange,
  required,
  disabled,
  dialDisabled,
  numberDisabled,
  error,
  helperText,
}: Props) {
  // India pinned to the top — it is the default and the overwhelming majority
  // of leads; everything else reads alphabetically so it can be typed to.
  const options = useMemo(() => {
    const rest = COUNTRIES.filter((c) => c.iso2 !== "IN").slice().sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    return [...COUNTRIES.filter((c) => c.iso2 === "IN"), ...rest];
  }, []);

  const country = countryByDial(dial) ?? countryByDial(DEFAULT_DIAL_CODE);
  const maxLength = country?.max ?? 15;

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="flex gap-2">
        <select
          aria-label="Country code"
          value={dial}
          disabled={disabled || dialDisabled}
          onChange={(e) => onDialChange(e.target.value)}
          className={cn(
            "w-[132px] shrink-0 px-2 py-2.5 rounded-lg border text-sm outline-none transition-colors bg-white",
            "disabled:bg-surface-100 disabled:cursor-not-allowed",
            error
              ? "border-red-300 focus:border-red-400 bg-red-50"
              : "border-surface-200 focus:border-primary",
          )}
        >
          {options.map((c) => (
            // iso2 keys the option because +1 is shared by US and Canada; the
            // value stays the dial code, which is what gets persisted.
            <option key={c.iso2} value={c.dial}>
              {c.name} {c.dial}
            </option>
          ))}
        </select>

        <input
          type="tel"
          inputMode="numeric"
          required={required}
          disabled={disabled || numberDisabled}
          maxLength={maxLength}
          placeholder={country ? `e.g. ${country.example}` : "Phone number"}
          value={value}
          onChange={(e) => onValueChange(e.target.value.replace(/\D/g, ""))}
          className={cn(
            "flex-1 min-w-0 px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors bg-white",
            "placeholder:text-gray-400 disabled:bg-surface-100 disabled:cursor-not-allowed",
            error
              ? "border-red-300 focus:border-red-400 bg-red-50"
              : "border-surface-200 focus:border-primary",
          )}
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      {!error && (
        <p className="text-xs text-gray-400">
          {helperText ?? nationalNumberHint(dial)}
        </p>
      )}
    </div>
  );
}
