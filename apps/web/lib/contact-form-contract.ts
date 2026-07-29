export const CONTACT_FORM_MAX_BODY_BYTES = 40_000;

const releaseGates = [
  "CONTACT_FORM_ENABLED",
  "CONTACT_FORM_DELIVERY_GATE",
  "CONTACT_FORM_PROCESSOR_GATE",
  "CONTACT_FORM_TRANSFER_GATE",
  "CONTACT_FORM_RETENTION_GATE",
  "CONTACT_FORM_SECURITY_GATE",
  "CONTACT_FORM_PRIVACY_GATE",
] as const;

const submissionFields = ["name", "email", "message", "website"] as const;

export type ContactSubmission = Readonly<{
  email: string;
  message: string;
  name: string;
  website: string;
}>;

export type ContactField = (typeof submissionFields)[number];

export type ContactValidationErrorCode =
  | "invalid_email"
  | "invalid_type"
  | "required"
  | "too_long"
  | "too_short";

export type ContactFormErrorCode = "invalid_request" | "unexpected_field";

export type ContactFieldErrors = Partial<
  Record<ContactField, ContactValidationErrorCode>
>;

export type ContactValidationResult =
  | Readonly<{ data: ContactSubmission; success: true }>
  | Readonly<{
      fieldErrors: ContactFieldErrors;
      formError?: ContactFormErrorCode;
      success: false;
    }>;

export type ContactFormResponse =
  | Readonly<{ status: "accepted" }>
  | Readonly<{ status: "ambiguous" }>
  | Readonly<{ status: "forbidden" }>
  | Readonly<{
      fieldErrors: ContactFieldErrors;
      formError?: ContactFormErrorCode;
      status: "invalid";
    }>
  | Readonly<{ retryAfterSeconds: number; status: "rate_limited" }>
  | Readonly<{ status: "too_large" }>
  | Readonly<{ status: "unavailable" }>
  | Readonly<{ status: "unsupported_media_type" }>;

type Environment = Readonly<Record<string, string | undefined>>;

function unicodeLength(value: string): number {
  return Array.from(value).length;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isEmailAddress(value: string): boolean {
  return (
    value.length <= 254 &&
    /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(
      value,
    )
  );
}

const validationErrorCodes = new Set<ContactValidationErrorCode>([
  "invalid_email",
  "invalid_type",
  "required",
  "too_long",
  "too_short",
]);

function isContactFieldErrors(value: unknown): value is ContactFieldErrors {
  return (
    isRecord(value) &&
    Object.entries(value).every(
      ([field, error]) =>
        submissionFields.includes(field as ContactField) &&
        validationErrorCodes.has(error as ContactValidationErrorCode),
    )
  );
}

export function isContactFormResponse(
  value: unknown,
): value is ContactFormResponse {
  if (!isRecord(value) || typeof value.status !== "string") {
    return false;
  }

  if (
    value.status === "accepted" ||
    value.status === "ambiguous" ||
    value.status === "forbidden" ||
    value.status === "too_large" ||
    value.status === "unavailable" ||
    value.status === "unsupported_media_type"
  ) {
    return true;
  }

  if (value.status === "rate_limited") {
    return (
      typeof value.retryAfterSeconds === "number" &&
      Number.isFinite(value.retryAfterSeconds)
    );
  }

  return (
    value.status === "invalid" &&
    isContactFieldErrors(value.fieldErrors) &&
    (value.formError === undefined ||
      value.formError === "invalid_request" ||
      value.formError === "unexpected_field")
  );
}

export function contactFormReleaseEnabled(environment: Environment): boolean {
  return releaseGates.every((gate) => environment[gate] === "true");
}

export function validateContactSubmission(
  value: unknown,
): ContactValidationResult {
  if (!isRecord(value)) {
    return { formError: "invalid_request", fieldErrors: {}, success: false };
  }

  const unexpectedField = Object.keys(value).find(
    (field) => !submissionFields.includes(field as ContactField),
  );
  if (unexpectedField) {
    return { formError: "unexpected_field", fieldErrors: {}, success: false };
  }

  const fieldErrors: ContactFieldErrors = {};
  const strings = Object.fromEntries(
    submissionFields.map((field) => {
      const candidate = value[field] ?? "";
      if (typeof candidate !== "string") {
        fieldErrors[field] = "invalid_type";
        return [field, ""];
      }
      return [field, candidate.trim()];
    }),
  ) as Record<ContactField, string>;

  if (unicodeLength(strings.name) > 100) {
    fieldErrors.name = "too_long";
  }
  if (!strings.email) {
    fieldErrors.email = "required";
  } else if (!isEmailAddress(strings.email)) {
    fieldErrors.email = "invalid_email";
  }

  const messageLength = unicodeLength(strings.message);
  if (messageLength === 0) {
    fieldErrors.message = "required";
  } else if (messageLength < 10) {
    fieldErrors.message = "too_short";
  } else if (messageLength > 5_000) {
    fieldErrors.message = "too_long";
  }

  return Object.keys(fieldErrors).length > 0
    ? { fieldErrors, success: false }
    : { data: strings, success: true };
}
