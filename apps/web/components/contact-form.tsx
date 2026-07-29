"use client";

import type { Locale } from "@portfolio/content";
import React, {
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  type ContactFieldErrors,
  isContactFormResponse,
  validateContactSubmission,
} from "../lib/contact-form-contract";
import { destinationRoute } from "../lib/routing";

const fieldOrder = ["name", "email", "message"] as const;
type VisibleField = (typeof fieldOrder)[number];
type SubmissionState =
  | "idle"
  | "sending"
  | "accepted"
  | "rate_limited"
  | "ambiguous";

const copy = {
  en: {
    ambiguous: "Delivery could not be confirmed.",
    copyFailed: "Copying failed. Select and copy the message manually.",
    copyMessage: "Copy message",
    copied: "Message copied.",
    directFallback: "Use one of the direct channels shown on this page.",
    errors: {
      email: {
        invalid_email: "Enter a valid email address.",
        invalid_type: "Enter a valid email address.",
        required: "Enter your reply email.",
        too_long: "Email must contain at most 254 characters.",
      },
      message: {
        invalid_type: "Enter a message.",
        required: "Enter a message.",
        too_long: "Enter at most 5,000 characters.",
        too_short: "Enter at least 10 characters.",
      },
      name: {
        invalid_type: "Enter a valid name.",
        too_long: "Enter at most 100 characters.",
      },
    },
    fieldOptional: "optional",
    formLabel: "Contact form",
    heading: "Send a message",
    labels: {
      email: "Reply email",
      message: "Message",
      name: "Name",
    },
    notice:
      "Your details are used only to receive and answer your enquiry. Email and message are required. Do not send confidential, special-category, or unnecessary personal data.",
    privacy: "Read the privacy notice.",
    rateLimited: "Too many attempts. Wait one minute before trying again.",
    send: "Send message",
    sending: "Sending…",
    success: "Your message was accepted for delivery.",
  },
  hr: {
    ambiguous: "Nije bilo moguće potvrditi isporuku.",
    copyFailed: "Kopiranje nije uspjelo. Ručno označite i kopirajte poruku.",
    copyMessage: "Kopiraj poruku",
    copied: "Poruka je kopirana.",
    directFallback: "Upotrijebite jedan od izravnih kanala na ovoj stranici.",
    errors: {
      email: {
        invalid_email: "Unesite valjanu adresu e-pošte.",
        invalid_type: "Unesite valjanu adresu e-pošte.",
        required: "Unesite adresu e-pošte za odgovor.",
        too_long: "Adresa e-pošte smije sadržavati najviše 254 znaka.",
      },
      message: {
        invalid_type: "Unesite poruku.",
        required: "Unesite poruku.",
        too_long: "Unesite najviše 5.000 znakova.",
        too_short: "Unesite najmanje 10 znakova.",
      },
      name: {
        invalid_type: "Unesite valjano ime.",
        too_long: "Unesite najviše 100 znakova.",
      },
    },
    fieldOptional: "neobavezno",
    formLabel: "Kontaktni obrazac",
    heading: "Pošaljite poruku",
    labels: {
      email: "E-pošta za odgovor",
      message: "Poruka",
      name: "Ime",
    },
    notice:
      "Vaši se podaci koriste samo za primitak upita i odgovor. E-pošta i poruka su obavezne. Ne šaljite povjerljive, posebne kategorije ni nepotrebne osobne podatke.",
    privacy: "Pročitajte obavijest o privatnosti.",
    rateLimited:
      "Previše pokušaja. Pričekajte jednu minutu prije novog pokušaja.",
    send: "Pošalji poruku",
    sending: "Slanje…",
    success: "Vaša je poruka prihvaćena za isporuku.",
  },
} as const;

type FormValues = Record<VisibleField | "website", string>;
type FieldErrors = Partial<Record<VisibleField, string>>;

const initialValues: FormValues = {
  email: "",
  message: "",
  name: "",
  website: "",
};

function visibleErrors(
  locale: Locale,
  fieldErrors: ContactFieldErrors,
): FieldErrors {
  const messages = copy[locale].errors;
  return Object.fromEntries(
    fieldOrder.flatMap((field) => {
      const code = fieldErrors[field];
      const fieldMessages = messages[field] as Record<string, string>;
      return code ? [[field, fieldMessages[code] ?? fieldMessages.invalid_type]] : [];
    }),
  );
}

export function ContactForm({ locale }: Readonly<{ locale: Locale }>) {
  const labels = copy[locale];
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [state, setState] = useState<SubmissionState>("idle");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const fieldRefs = {
    email: useRef<HTMLInputElement>(null),
    message: useRef<HTMLTextAreaElement>(null),
    name: useRef<HTMLInputElement>(null),
  };
  const pending = useRef(false);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (
      state === "accepted" ||
      state === "rate_limited" ||
      state === "ambiguous"
    ) {
      const focusStatus = window.setTimeout(() => {
        statusRef.current?.focus();
      }, 0);
      return () => window.clearTimeout(focusStatus);
    }
    return undefined;
  }, [state]);

  function updateValue(field: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    if (field !== "website" && errors[field]) {
      setErrors((current) => ({ ...current, [field]: undefined }));
    }
    if (copyStatus !== "idle") {
      setCopyStatus("idle");
    }
  }

  function validateField(field: VisibleField) {
    const result = validateContactSubmission(values);
    const message = result.success
      ? undefined
      : visibleErrors(locale, result.fieldErrors)[field];
    setErrors((current) => ({ ...current, [field]: message }));
  }

  function focusFirstError(fieldErrors: FieldErrors) {
    const firstInvalidField = fieldOrder.find((field) => fieldErrors[field]);
    if (firstInvalidField) {
      fieldRefs[firstInvalidField].current?.focus();
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || state === "ambiguous") {
      return;
    }

    if (values.website.trim()) {
      setValues(initialValues);
      setErrors({});
      setState("accepted");
      return;
    }

    const validation = validateContactSubmission(values);
    if (!validation.success) {
      const nextErrors = visibleErrors(locale, validation.fieldErrors);
      setErrors(nextErrors);
      focusFirstError(nextErrors);
      return;
    }

    pending.current = true;
    setErrors({});
    setState("sending");
    setCopyStatus("idle");

    try {
      const response = await fetch("/api/contact", {
        body: JSON.stringify(validation.data),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const value: unknown = await response.json();
      const result = isContactFormResponse(value) ? value : null;

      if (response.ok && result?.status === "accepted") {
        setValues(initialValues);
        setState("accepted");
      } else if (response.status === 400 && result?.status === "invalid") {
        const nextErrors = visibleErrors(locale, result.fieldErrors);
        setErrors(nextErrors);
        setState("idle");
        focusFirstError(nextErrors);
      } else if (
        response.status === 429 &&
        result?.status === "rate_limited"
      ) {
        setState("rate_limited");
      } else {
        setState("ambiguous");
      }
    } catch {
      setState("ambiguous");
    } finally {
      pending.current = false;
    }
  }

  async function copyCurrentMessage() {
    try {
      await navigator.clipboard.writeText(values.message);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  }

  const statusMessage =
    state === "sending"
      ? labels.sending
      : state === "accepted"
        ? labels.success
        : state === "rate_limited"
          ? labels.rateLimited
          : state === "ambiguous"
            ? labels.ambiguous
            : null;

  return (
    <section className="contact-form-panel" aria-labelledby="contact-form-heading">
      <header>
        <p className="eyebrow">{labels.formLabel}</p>
        <h2 id="contact-form-heading">{labels.heading}</h2>
      </header>

      <form aria-label={labels.formLabel} noValidate onSubmit={submit}>
        <div className="contact-form-field">
          <label htmlFor="contact-name">
            {labels.labels.name}{" "}
            <span className="field-optional">({labels.fieldOptional})</span>
          </label>
          <input
            aria-describedby={
              errors.name ? "contact-name-error" : undefined
            }
            aria-invalid={errors.name ? true : undefined}
            autoComplete="name"
            id="contact-name"
            name="name"
            onBlur={() => validateField("name")}
            onChange={(event) => updateValue("name", event.target.value)}
            ref={fieldRefs.name}
            type="text"
            value={values.name}
          />
          {errors.name && (
            <p className="field-error" id="contact-name-error">
              {errors.name}
            </p>
          )}
        </div>

        <div className="contact-form-field">
          <label htmlFor="contact-email">{labels.labels.email}</label>
          <input
            aria-describedby={
              errors.email ? "contact-email-error" : undefined
            }
            aria-invalid={errors.email ? true : undefined}
            autoComplete="email"
            id="contact-email"
            inputMode="email"
            name="email"
            onBlur={() => validateField("email")}
            onChange={(event) => updateValue("email", event.target.value)}
            ref={fieldRefs.email}
            required
            type="email"
            value={values.email}
          />
          {errors.email && (
            <p className="field-error" id="contact-email-error">
              {errors.email}
            </p>
          )}
        </div>

        <div className="contact-form-field contact-form-message">
          <label htmlFor="contact-message">{labels.labels.message}</label>
          <textarea
            aria-describedby={
              errors.message ? "contact-message-error" : undefined
            }
            aria-invalid={errors.message ? true : undefined}
            id="contact-message"
            name="message"
            onBlur={() => validateField("message")}
            onChange={(event) => updateValue("message", event.target.value)}
            ref={fieldRefs.message}
            required
            rows={8}
            value={values.message}
          />
          {errors.message && (
            <p className="field-error" id="contact-message-error">
              {errors.message}
            </p>
          )}
        </div>

        <div aria-hidden="true" className="contact-honeypot" inert>
          <label htmlFor="contact-website">Website</label>
          <input
            autoComplete="off"
            id="contact-website"
            name="website"
            onChange={(event) => updateValue("website", event.target.value)}
            tabIndex={-1}
            type="text"
            value={values.website}
          />
        </div>

        <p className="contact-form-notice">
          {labels.notice}{" "}
          <a href={destinationRoute(locale, "privacy")}>{labels.privacy}</a>
        </p>

        <div className="contact-form-actions">
          <button
            className="button button-primary"
            disabled={state === "sending" || state === "ambiguous"}
            type="submit"
          >
            {state === "sending" ? labels.sending : labels.send}
          </button>
          {state === "ambiguous" && (
            <button
              className="button button-secondary"
              onClick={copyCurrentMessage}
              type="button"
            >
              {labels.copyMessage}
            </button>
          )}
        </div>

        {statusMessage && (
          <div
            className={`contact-form-status contact-form-status-${state}`}
            ref={statusRef}
            role="status"
            tabIndex={-1}
          >
            <strong>{statusMessage}</strong>
            {state === "ambiguous" && <p>{labels.directFallback}</p>}
          </div>
        )}
        {copyStatus !== "idle" && (
          <p aria-live="polite" className="copy-status">
            {copyStatus === "copied" ? labels.copied : labels.copyFailed}
          </p>
        )}
      </form>
    </section>
  );
}
