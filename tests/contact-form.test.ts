import assert from "node:assert/strict";
import test from "node:test";

import {
  CONTACT_FORM_MAX_BODY_BYTES,
  contactFormReleaseEnabled,
  validateContactSubmission,
} from "../apps/web/lib/contact-form-contract";
import {
  createContactFormHandler,
  createMemoryContactRateLimiter,
  privacyPreservingIpToken,
} from "../apps/web/lib/contact-form-handler";
import {
  createSesContactDelivery,
  createSesContactClient,
  readSesContactConfiguration,
} from "../apps/web/lib/contact-ses";
import { contactFormAvailable } from "../apps/web/lib/contact-form-server";
import { POST } from "../apps/web/app/api/contact/route";

const validSubmission = {
  email: "visitor@example.com",
  message: "A valid contact message.",
  name: "Visitor",
  website: "",
};
const boundaryEmail = `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(61)}`;

test("contact validation trims exact fields and counts Unicode code points", () => {
  const result = validateContactSubmission({
    email: "  visitor@example.com  ",
    message: `  ${"🙂".repeat(10)}  `,
    name: `  ${"č".repeat(100)}  `,
    website: "",
  });

  assert.deepEqual(result, {
    data: {
      email: "visitor@example.com",
      message: "🙂".repeat(10),
      name: "č".repeat(100),
      website: "",
    },
    success: true,
  });

  for (const [field, value] of [
    ["name", "🙂".repeat(101)],
    ["email", `${"a".repeat(243)}@example.com`],
    ["message", "🙂".repeat(9)],
    ["message", "🙂".repeat(5_001)],
  ] as const) {
    const invalid = validateContactSubmission({
      ...validSubmission,
      [field]: value,
    });
    assert.equal(invalid.success, false, `${field} boundary must fail`);
    if (!invalid.success) {
      assert.ok(invalid.fieldErrors[field]);
    }
  }

  const malformedEmail = validateContactSubmission({
    ...validSubmission,
    email: "visitor@localhost",
  });
  assert.equal(malformedEmail.success, false);
  if (!malformedEmail.success) {
    assert.ok(malformedEmail.fieldErrors.email);
  }

  assert.equal(boundaryEmail.length, 254);
  for (const boundary of [
    { ...validSubmission, name: "" },
    { ...validSubmission, name: "🙂".repeat(100) },
    { ...validSubmission, email: boundaryEmail },
    { ...validSubmission, message: "🙂".repeat(10) },
    { ...validSubmission, message: "🙂".repeat(5_000) },
  ]) {
    assert.equal(validateContactSubmission(boundary).success, true);
  }
});

test("the direct API enforces every field boundary and accepts worst-case valid JSON", async () => {
  const delivered: unknown[] = [];
  const handler = createContactFormHandler({
    deliver: async (submission) => {
      delivered.push(submission);
    },
    ipTokenSecret: "test-only-rate-limit-secret",
    rateLimiter: createMemoryContactRateLimiter({
      clientAttemptLimit: 100,
      routeAttemptLimit: 100,
    }),
  });

  const validBoundaries = [
    { ...validSubmission, name: "" },
    { ...validSubmission, name: "🙂".repeat(100) },
    { ...validSubmission, email: boundaryEmail },
    { ...validSubmission, message: "🙂".repeat(10) },
    { ...validSubmission, message: "\u0001".repeat(5_000) },
  ];
  for (const submission of validBoundaries) {
    const response = await handler(contactRequest(submission));
    assert.equal(response.status, 200);
  }

  const invalidBoundaries = [
    { ...validSubmission, name: "🙂".repeat(101) },
    { ...validSubmission, email: `${boundaryEmail}x` },
    { ...validSubmission, email: "visitor@localhost" },
    { ...validSubmission, message: "🙂".repeat(9) },
    { ...validSubmission, message: "🙂".repeat(5_001) },
    { ...validSubmission, message: " \n\t " },
    { ...validSubmission, subject: "unexpected" },
    { ...validSubmission, email: 42 },
  ];
  for (const submission of invalidBoundaries) {
    const response = await handler(contactRequest(submission));
    assert.equal(response.status, 400);
    assert.equal((await response.json()).status, "invalid");
  }

  assert.equal(delivered.length, validBoundaries.length);
});

test("contact validation rejects missing, non-string, or unexpected fields", () => {
  assert.equal(validateContactSubmission(null).success, false);
  assert.equal(
    validateContactSubmission({
      ...validSubmission,
      subject: "Unexpected",
    }).success,
    false,
  );
  assert.equal(
    validateContactSubmission({
      ...validSubmission,
      email: 42,
    }).success,
    false,
  );
});

test("the form is enabled only when every named release gate passes", () => {
  const enabled = {
    CONTACT_FORM_DELIVERY_GATE: "true",
    CONTACT_FORM_ENABLED: "true",
    CONTACT_FORM_PRIVACY_GATE: "true",
    CONTACT_FORM_PROCESSOR_GATE: "true",
    CONTACT_FORM_RETENTION_GATE: "true",
    CONTACT_FORM_SECURITY_GATE: "true",
    CONTACT_FORM_TRANSFER_GATE: "true",
  };

  assert.equal(contactFormReleaseEnabled(enabled), true);

  for (const gate of Object.keys(enabled)) {
    assert.equal(
      contactFormReleaseEnabled({ ...enabled, [gate]: "false" }),
      false,
      `${gate} must disable the form`,
    );
  }
});

function contactRequest(
  body: unknown,
  headers: Readonly<Record<string, string>> = {},
) {
  return new Request("https://portfolio.example/api/contact", {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      origin: "https://portfolio.example",
      ...headers,
    },
    method: "POST",
  });
}

test("the endpoint accepts once, bounds requests, and rejects cross-origin browsers", async () => {
  const delivered: unknown[] = [];
  const handler = createContactFormHandler({
    deliver: async (submission) => {
      delivered.push(submission);
    },
    ipTokenSecret: "test-only-rate-limit-secret",
    rateLimiter: createMemoryContactRateLimiter(),
  });

  const accepted = await handler(
    contactRequest(validSubmission, { "cf-connecting-ip": "203.0.113.10" }),
  );
  assert.equal(accepted.status, 200);
  assert.deepEqual(await accepted.json(), { status: "accepted" });
  assert.deepEqual(delivered, [validSubmission]);

  const crossOrigin = await handler(
    contactRequest(validSubmission, {
      origin: "https://attacker.example",
      "sec-fetch-site": "cross-site",
    }),
  );
  assert.equal(crossOrigin.status, 403);

  const oversized = await handler(
    contactRequest(validSubmission, {
      "content-length": String(CONTACT_FORM_MAX_BODY_BYTES + 1),
    }),
  );
  assert.equal(oversized.status, 413);
  assert.equal(delivered.length, 1);
});

test("the honeypot returns apparent success without delivery", async () => {
  let deliveryCount = 0;
  const handler = createContactFormHandler({
    deliver: async () => {
      deliveryCount += 1;
    },
    ipTokenSecret: "test-only-rate-limit-secret",
    rateLimiter: createMemoryContactRateLimiter(),
  });

  const response = await handler(
    contactRequest({
      email: "invalid",
      message: "",
      name: 42,
      website: "bot-field",
    }),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "accepted" });
  assert.equal(deliveryCount, 0);
});

test("the limiter enforces a conservative route-wide ceiling", () => {
  const limiter = createMemoryContactRateLimiter({
    routeAttemptLimit: 2,
  });

  assert.equal(limiter.check("client-a").allowed, true);
  assert.equal(limiter.check("client-b").allowed, true);
  assert.deepEqual(limiter.check("client-c"), {
    allowed: false,
    retryAfterSeconds: 60,
  });
});

test("client-blocked requests still consume the route-wide ceiling", () => {
  const limiter = createMemoryContactRateLimiter({
    clientAttemptLimit: 1,
    routeAttemptLimit: 3,
  });

  assert.equal(limiter.check("client-a").allowed, true);
  assert.equal(limiter.check("client-a").allowed, false);
  assert.equal(limiter.check("client-a").allowed, false);
  assert.equal(limiter.check("client-b").allowed, false);
});

test("the endpoint allows at most five attempts per privacy-preserving IP token", async () => {
  let deliveryCount = 0;
  let now = 1_000;
  const rateLimiter = createMemoryContactRateLimiter({ now: () => now });
  const handler = createContactFormHandler({
    deliver: async () => {
      deliveryCount += 1;
    },
    ipTokenSecret: "test-only-rate-limit-secret",
    rateLimiter,
  });
  const headers = { "cf-connecting-ip": "203.0.113.10" };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    assert.equal(
      (await handler(contactRequest(validSubmission, headers))).status,
      200,
    );
  }

  const limited = await handler(contactRequest(validSubmission, headers));
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "60");
  assert.deepEqual(await limited.json(), {
    retryAfterSeconds: 60,
    status: "rate_limited",
  });
  assert.equal(deliveryCount, 5);

  now += 60_000;
  assert.equal(
    (await handler(contactRequest(validSubmission, headers))).status,
    200,
  );
  assert.equal(deliveryCount, 6);

  const token = await privacyPreservingIpToken(
    "203.0.113.10",
    "test-only-rate-limit-secret",
  );
  assert.notEqual(token, "203.0.113.10");
  assert.doesNotMatch(token, /203\.0\.113\.10/);
});

test("invalid requests consume both request ceilings", async () => {
  const handler = createContactFormHandler({
    deliver: async () => {},
    ipTokenSecret: "test-only-rate-limit-secret",
    rateLimiter: createMemoryContactRateLimiter({
      clientAttemptLimit: 2,
      routeAttemptLimit: 2,
    }),
  });

  assert.equal(
    (await handler(contactRequest({ ...validSubmission, email: "invalid" })))
      .status,
    400,
  );
  assert.equal(
    (await handler(contactRequest({ ...validSubmission, message: "short" })))
      .status,
    400,
  );
  assert.equal(
    (await handler(contactRequest(validSubmission))).status,
    429,
  );
});

test("provider ambiguity is not retried, echoed, or written to logs", async () => {
  let deliveryCount = 0;
  const logged: unknown[] = [];
  const originalConsole = {
    debug: console.debug,
    error: console.error,
    info: console.info,
    log: console.log,
    warn: console.warn,
  };
  for (const method of Object.keys(originalConsole) as Array<
    keyof typeof originalConsole
  >) {
    console[method] = (...values: unknown[]) => {
      logged.push(...values);
    };
  }

  try {
    const handler = createContactFormHandler({
      deliver: async () => {
        deliveryCount += 1;
        throw new Error(`provider rejected ${validSubmission.email}`);
      },
      ipTokenSecret: "test-only-rate-limit-secret",
      rateLimiter: createMemoryContactRateLimiter(),
    });
    const response = await handler(contactRequest(validSubmission));
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { status: "ambiguous" });
    assert.equal(deliveryCount, 1);
    assert.deepEqual(logged, []);
  } finally {
    Object.assign(console, originalConsole);
  }
});

test("the SES adapter uses fixed EEA routing, plain text, and Reply-To", async () => {
  const calls: Array<{ command: { input: Record<string, unknown> } }> = [];
  const configuration = {
    accessKeyId: "example-access-key",
    fromAddress: "portfolio@example.com",
    region: "eu-central-1",
    secretAccessKey: "example-secret-key",
    toAddress: "owner@example.com",
  };
  const deliver = createSesContactDelivery(configuration, {
    async send(command) {
      calls.push({ command });
      return {};
    },
  });

  await deliver(validSubmission);

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0]?.command.input, {
    Content: {
      Simple: {
        Body: {
          Text: {
            Charset: "UTF-8",
            Data: [
              "Name: Visitor",
              "Reply email: visitor@example.com",
              "",
              "Message:",
              "A valid contact message.",
            ].join("\n"),
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: "Portfolio contact message",
        },
      },
    },
    Destination: { ToAddresses: ["owner@example.com"] },
    FromEmailAddress: "portfolio@example.com",
    ReplyToAddresses: ["visitor@example.com"],
  });

  const client = createSesContactClient(configuration);
  assert.equal(await client.config.maxAttempts(), 1);
});

test("SES configuration is unavailable outside approved EEA regions or without secrets", () => {
  const environment = {
    AWS_ACCESS_KEY_ID: "example-access-key",
    AWS_SECRET_ACCESS_KEY: "example-secret-key",
    CONTACT_RATE_LIMIT_SECRET: "rate-limit-secret-with-32-characters",
    CONTACT_SES_FROM: "portfolio@example.com",
    CONTACT_SES_REGION: "eu-central-1",
    CONTACT_SES_TO: "owner@example.com",
  };

  assert.deepEqual(readSesContactConfiguration(environment), {
    accessKeyId: "example-access-key",
    fromAddress: "portfolio@example.com",
    ipTokenSecret: "rate-limit-secret-with-32-characters",
    region: "eu-central-1",
    secretAccessKey: "example-secret-key",
    toAddress: "owner@example.com",
  });
  assert.equal(
    readSesContactConfiguration({
      ...environment,
      CONTACT_SES_REGION: "us-east-1",
    }),
    null,
  );
  assert.equal(
    readSesContactConfiguration({
      ...environment,
      CONTACT_RATE_LIMIT_SECRET: "too-short",
    }),
    null,
  );
  assert.equal(
    readSesContactConfiguration({
      ...environment,
      AWS_SECRET_ACCESS_KEY: "",
    }),
    null,
  );
});

test("form availability requires release gates and complete runtime configuration", () => {
  const environment = {
    AWS_ACCESS_KEY_ID: "example-access-key",
    AWS_SECRET_ACCESS_KEY: "example-secret-key",
    CONTACT_FORM_DELIVERY_GATE: "true",
    CONTACT_FORM_ENABLED: "true",
    CONTACT_FORM_PRIVACY_GATE: "true",
    CONTACT_FORM_PROCESSOR_GATE: "true",
    CONTACT_FORM_RETENTION_GATE: "true",
    CONTACT_FORM_SECURITY_GATE: "true",
    CONTACT_FORM_TRANSFER_GATE: "true",
    CONTACT_RATE_LIMIT_SECRET: "rate-limit-secret-with-32-characters",
    CONTACT_SES_FROM: "portfolio@example.com",
    CONTACT_SES_REGION: "eu-central-1",
    CONTACT_SES_TO: "owner@example.com",
  };

  assert.equal(contactFormAvailable(environment), true);
  assert.equal(
    contactFormAvailable({
      ...environment,
      CONTACT_FORM_PROCESSOR_GATE: "false",
    }),
    false,
  );
  assert.equal(
    contactFormAvailable({
      ...environment,
      CONTACT_RATE_LIMIT_SECRET: "",
    }),
    false,
  );
});

test("the production route is unavailable when the form gate is closed", async () => {
  const response = await POST(contactRequest(validSubmission));
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { status: "unavailable" });
});
