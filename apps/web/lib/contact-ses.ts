import {
  SendEmailCommand,
  SESv2Client,
  type SESv2ClientConfig,
} from "@aws-sdk/client-sesv2";

import {
  type ContactSubmission,
  isEmailAddress,
} from "./contact-form-contract";

const EEA_SES_REGIONS = new Set([
  "eu-central-1",
  "eu-west-1",
  "eu-west-3",
  "eu-north-1",
  "eu-south-1",
  "eu-south-2",
]);

const DELIVERY_TIMEOUT_MS = 8_000;

type Environment = Readonly<Record<string, string | undefined>>;

export type SesContactConfiguration = Readonly<{
  accessKeyId: string;
  fromAddress: string;
  region: string;
  secretAccessKey: string;
  toAddress: string;
}>;

export type ContactRuntimeConfiguration = SesContactConfiguration &
  Readonly<{ ipTokenSecret: string }>;

type SesContactClient = Readonly<{
  send(
    command: SendEmailCommand,
    options?: Readonly<{ abortSignal?: AbortSignal }>,
  ): Promise<unknown>;
}>;

function requiredValue(
  environment: Environment,
  name: string,
): string | null {
  const value = environment[name];
  return value?.trim() ? value : null;
}

export function readSesContactConfiguration(
  environment: Environment,
): ContactRuntimeConfiguration | null {
  const accessKeyId = requiredValue(environment, "AWS_ACCESS_KEY_ID");
  const secretAccessKey = requiredValue(
    environment,
    "AWS_SECRET_ACCESS_KEY",
  );
  const region = requiredValue(environment, "CONTACT_SES_REGION");
  const fromAddress = requiredValue(environment, "CONTACT_SES_FROM");
  const toAddress = requiredValue(environment, "CONTACT_SES_TO");
  const ipTokenSecret = requiredValue(
    environment,
    "CONTACT_RATE_LIMIT_SECRET",
  );

  if (
    !accessKeyId ||
    !secretAccessKey ||
    !region ||
    !EEA_SES_REGIONS.has(region) ||
    !fromAddress ||
    !isEmailAddress(fromAddress) ||
    !toAddress ||
    !isEmailAddress(toAddress) ||
    !ipTokenSecret ||
    ipTokenSecret.length < 32
  ) {
    return null;
  }

  return {
    accessKeyId,
    fromAddress,
    ipTokenSecret,
    region,
    secretAccessKey,
    toAddress,
  };
}

export function createSesContactClient(
  configuration: SesContactConfiguration,
): SESv2Client {
  const clientConfiguration: SESv2ClientConfig = {
    credentials: {
      accessKeyId: configuration.accessKeyId,
      secretAccessKey: configuration.secretAccessKey,
    },
    maxAttempts: 1,
    region: configuration.region,
  };
  return new SESv2Client(clientConfiguration);
}

export function createSesContactDelivery(
  configuration: SesContactConfiguration,
  client: SesContactClient = createSesContactClient(configuration),
): (submission: ContactSubmission) => Promise<void> {
  return async (submission) => {
    const body = [
      `Name: ${submission.name || "(not provided)"}`,
      `Reply email: ${submission.email}`,
      "",
      "Message:",
      submission.message,
    ].join("\n");
    const command = new SendEmailCommand({
      Content: {
        Simple: {
          Body: {
            Text: {
              Charset: "UTF-8",
              Data: body,
            },
          },
          Subject: {
            Charset: "UTF-8",
            Data: "Portfolio contact message",
          },
        },
      },
      Destination: {
        ToAddresses: [configuration.toAddress],
      },
      FromEmailAddress: configuration.fromAddress,
      ReplyToAddresses: [submission.email],
    });

    await client.send(command, {
      abortSignal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
    });
  };
}
