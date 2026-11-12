"use client";

import { useId, useState, type FormEvent } from "react";
import {
  formatCardNumberInput,
  validateCard,
  type CardErrors,
  type CardField,
  type CardInput,
} from "@/lib/card";
import { primaryButton } from "../ui/styles";

const EMPTY_CARD: CardInput = { name: "", number: "", expiry: "", cvc: "" };

type CardFormProps = {
  /** Formatted amount shown on the submit button, e.g. "€42.00". */
  amountLabel: string;
  /**
   * Called with card details that passed client-side validation. Resolve with
   * field errors to show them (e.g. returned by the API), or nothing on success.
   */
  onSubmit: (card: CardInput) => Promise<CardErrors | void>;
  /** Form-level error, e.g. a declined card. */
  formError?: string | null;
};

const FIELDS: {
  name: CardField;
  label: string;
  autoComplete: string;
  inputMode?: "numeric" | "text";
  placeholder?: string;
}[] = [
  { name: "name", label: "Name on card", autoComplete: "cc-name", placeholder: "Alex Andersson" },
  {
    name: "number",
    label: "Card number",
    autoComplete: "cc-number",
    inputMode: "numeric",
    placeholder: "1234 1234 1234 1234",
  },
  {
    name: "expiry",
    label: "Expiry (MM/YY)",
    autoComplete: "cc-exp",
    inputMode: "numeric",
    placeholder: "MM/YY",
  },
  {
    name: "cvc",
    label: "Security code",
    autoComplete: "cc-csc",
    inputMode: "numeric",
    placeholder: "123",
  },
];

export function CardForm({ amountLabel, onSubmit, formError }: CardFormProps) {
  const idPrefix = useId();
  const [values, setValues] = useState<CardInput>(EMPTY_CARD);
  const [errors, setErrors] = useState<CardErrors>({});
  const [submitting, setSubmitting] = useState(false);

  function handleChange(field: CardField, value: string) {
    setValues((current) => ({
      ...current,
      [field]: field === "number" ? formatCardNumberInput(value) : value,
    }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const result = validateCard(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const serverErrors = await onSubmit(values);
      if (serverErrors) setErrors(serverErrors);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-labelledby={`${idPrefix}-heading`}>
      <h2 id={`${idPrefix}-heading`} className="text-lg font-semibold">
        Payment details
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-4">
        {FIELDS.map((field) => {
          const inputId = `${idPrefix}-${field.name}`;
          const errorId = `${inputId}-error`;
          const error = errors[field.name];
          const wide = field.name === "name" || field.name === "number";
          return (
            <div key={field.name} className={wide ? "col-span-2" : "col-span-1"}>
              <label htmlFor={inputId} className="block text-sm font-medium text-stone-700">
                {field.label}
              </label>
              <input
                id={inputId}
                name={field.name}
                type="text"
                autoComplete={field.autoComplete}
                inputMode={field.inputMode}
                placeholder={field.placeholder}
                value={values[field.name]}
                onChange={(event) => handleChange(field.name, event.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                className={`mt-1 block w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-xs placeholder:text-stone-400 focus:ring-2 focus:outline-none ${
                  error
                    ? "border-red-500 focus:ring-red-200"
                    : "border-stone-300 focus:border-amber-700 focus:ring-amber-200"
                }`}
              />
              {error && (
                <p id={errorId} className="mt-1 text-xs text-red-700">
                  {error}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {formError && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {formError}
        </p>
      )}

      <button
        type="submit"
        className={`${primaryButton} mt-6 w-full py-3 text-base`}
        disabled={submitting}
      >
        {submitting ? "Processing…" : `Confirm purchase · ${amountLabel}`}
      </button>
      <p className="mt-2 text-center text-xs text-stone-500">
        Test mode: your card will not be charged.
      </p>
    </form>
  );
}
