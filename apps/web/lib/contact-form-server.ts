import { contactFormReleaseEnabled } from "./contact-form-contract";
import {
  createContactFormHandler,
  createMemoryContactRateLimiter,
  type ContactRateLimiter,
} from "./contact-form-handler";
import {
  createSesContactDelivery,
  readSesContactConfiguration,
} from "./contact-ses";

type Environment = Readonly<Record<string, string | undefined>>;

export function contactFormAvailable(environment: Environment): boolean {
  return (
    contactFormReleaseEnabled(environment) &&
    readSesContactConfiguration(environment) !== null
  );
}

export function createConfiguredContactFormHandler(
  environment: Environment,
  rateLimiter: ContactRateLimiter = createMemoryContactRateLimiter(),
): ((request: Request) => Promise<Response>) | null {
  if (!contactFormReleaseEnabled(environment)) {
    return null;
  }

  const configuration = readSesContactConfiguration(environment);
  if (!configuration) {
    return null;
  }

  return createContactFormHandler({
    deliver: createSesContactDelivery(configuration),
    ipTokenSecret: configuration.ipTokenSecret,
    rateLimiter,
  });
}
