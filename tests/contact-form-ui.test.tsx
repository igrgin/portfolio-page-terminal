import assert from "node:assert/strict";
import test, { after, afterEach, beforeEach } from "node:test";
import { JSDOM } from "jsdom";
import React from "react";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "https://portfolio.example/en/contact",
});
Object.defineProperties(globalThis, {
  document: { configurable: true, value: dom.window.document },
  HTMLElement: { configurable: true, value: dom.window.HTMLElement },
  HTMLFormElement: {
    configurable: true,
    value: dom.window.HTMLFormElement,
  },
  localStorage: { configurable: true, value: dom.window.localStorage },
  navigator: { configurable: true, value: dom.window.navigator },
  sessionStorage: { configurable: true, value: dom.window.sessionStorage },
  window: { configurable: true, value: dom.window },
});
const { cleanup, fireEvent, render, waitFor } =
  await import("@testing-library/react");
const { ContactForm } = await import("../apps/web/components/contact-form");
const originalFetch = globalThis.fetch;
const originalStorageSetItem = dom.window.Storage.prototype.setItem;
let storageWriteCount = 0;

beforeEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
  sessionStorage.clear();
  storageWriteCount = 0;
  dom.window.Storage.prototype.setItem = function (...arguments_) {
    storageWriteCount += 1;
    return originalStorageSetItem.apply(this, arguments_);
  };
});

afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
  dom.window.Storage.prototype.setItem = originalStorageSetItem;
});

after(() => dom.window.close());

function fillValidForm(container: HTMLElement) {
  fireEvent.change(container.querySelector("#contact-name")!, {
    target: { value: "Visitor" },
  });
  fireEvent.change(container.querySelector("#contact-email")!, {
    target: { value: "visitor@example.com" },
  });
  fireEvent.change(container.querySelector("#contact-message")!, {
    target: { value: "A valid contact message." },
  });
}

test("English validation preserves entries, associates errors, and focuses the first error", () => {
  const { container, getByRole, getByText } = render(
    <ContactForm locale="en" />,
  );
  fireEvent.change(container.querySelector("#contact-name")!, {
    target: { value: "Visitor" },
  });
  fireEvent.change(container.querySelector("#contact-email")!, {
    target: { value: "visitor@localhost" },
  });
  fireEvent.change(container.querySelector("#contact-message")!, {
    target: { value: "short" },
  });

  fireEvent.submit(getByRole("form", { name: "Contact form" }));

  const email = container.querySelector<HTMLInputElement>("#contact-email")!;
  const message =
    container.querySelector<HTMLTextAreaElement>("#contact-message")!;
  assert.equal(document.activeElement, email);
  assert.equal(email.value, "visitor@localhost");
  assert.equal(message.value, "short");
  assert.equal(email.getAttribute("aria-describedby"), "contact-email-error");
  assert.equal(email.getAttribute("aria-invalid"), "true");
  getByText("Enter a valid email address.");
  getByText("Enter at least 10 characters.");
  assert.equal(localStorage.length, 0);
  assert.equal(sessionStorage.length, 0);
  assert.equal(storageWriteCount, 0);
});

test("browser validation accepts and rejects every Unicode length boundary", async () => {
  const boundaryEmail = `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(61)}`;
  const scenarios = [
    { field: "name", valid: true, value: "" },
    { field: "name", valid: true, value: "🙂".repeat(100) },
    { field: "name", valid: false, value: "🙂".repeat(101) },
    { field: "email", valid: true, value: boundaryEmail },
    { field: "email", valid: false, value: `${boundaryEmail}x` },
    { field: "email", valid: false, value: "visitor@localhost" },
    { field: "message", valid: true, value: "🙂".repeat(10) },
    { field: "message", valid: true, value: "🙂".repeat(5_000) },
    { field: "message", valid: false, value: "🙂".repeat(9) },
    { field: "message", valid: false, value: "🙂".repeat(5_001) },
    { field: "message", valid: false, value: " \n\t " },
  ] as const;

  for (const scenario of scenarios) {
    cleanup();
    document.body.replaceChildren();
    let requestCount = 0;
    globalThis.fetch = async () => {
      requestCount += 1;
      return Response.json({ status: "accepted" });
    };
    const { container, getByRole } = render(<ContactForm locale="en" />);
    fillValidForm(container);
    fireEvent.change(container.querySelector(`#contact-${scenario.field}`)!, {
      target: { value: scenario.value },
    });
    fireEvent.submit(getByRole("form", { name: "Contact form" }));

    if (scenario.valid) {
      await waitFor(() => assert.equal(requestCount, 1));
    } else {
      assert.equal(requestCount, 0);
    }
  }

  assert.equal(storageWriteCount, 0);
});

test("blur validation is immediate and localized in Croatian", () => {
  const { container, getByText } = render(<ContactForm locale="hr" />);
  const email = container.querySelector<HTMLInputElement>("#contact-email")!;
  fireEvent.change(email, { target: { value: "visitor@localhost" } });
  fireEvent.blur(email);

  getByText("Unesite valjanu adresu e-pošte.");
  assert.equal(email.getAttribute("aria-invalid"), "true");
});

test("a browser-filled honeypot reports apparent success without a request", async () => {
  let requestCount = 0;
  globalThis.fetch = async () => {
    requestCount += 1;
    return Response.json({ status: "accepted" });
  };
  const { container, getByRole, getByText } = render(
    <ContactForm locale="en" />,
  );
  fireEvent.change(container.querySelector("#contact-website")!, {
    target: { value: "bot-field" },
  });

  fireEvent.submit(getByRole("form", { name: "Contact form" }));

  await waitFor(() => {
    getByText("Your message was accepted for delivery.");
  });
  assert.equal(requestCount, 0);
});

test("submitting exposes sending state and disables duplicate submission", () => {
  let requestCount = 0;
  globalThis.fetch = async () => {
    requestCount += 1;
    return new Promise<Response>(() => {});
  };
  const { container, getByRole } = render(
    <ContactForm locale="en" />,
  );
  fillValidForm(container);
  const form = getByRole("form", { name: "Contact form" });

  fireEvent.submit(form);
  fireEvent.submit(form);

  assert.equal(requestCount, 1);
  assert.equal(
    (getByRole("button", { name: "Sending…" }) as HTMLButtonElement).disabled,
    true,
  );
});

test("accepted delivery clears fields and focuses the honest status", async () => {
  globalThis.fetch = async () =>
    Response.json({ status: "accepted" }, { status: 200 });
  const { container, getByRole, getByText } = render(
    <ContactForm locale="en" />,
  );
  fillValidForm(container);

  fireEvent.submit(getByRole("form", { name: "Contact form" }));
  const status = getByRole("status");
  await waitFor(() => {
    getByText("Your message was accepted for delivery.");
    assert.equal(document.activeElement === status, true);
  });
  assert.equal(
    container.querySelector<HTMLInputElement>("#contact-name")!.value,
    "",
  );
  assert.equal(
    container.querySelector<HTMLInputElement>("#contact-email")!.value,
    "",
  );
  assert.equal(
    container.querySelector<HTMLTextAreaElement>("#contact-message")!.value,
    "",
  );
});

test("rate limits preserve entries and explain when to retry", async () => {
  globalThis.fetch = async () =>
    Response.json(
      { retryAfterSeconds: 60, status: "rate_limited" },
      { status: 429 },
    );
  const { container, getByRole, getByText } = render(
    <ContactForm locale="en" />,
  );
  fillValidForm(container);

  fireEvent.submit(getByRole("form", { name: "Contact form" }));

  await waitFor(() => {
    getByText("Too many attempts. Wait one minute before trying again.");
  });
  assert.equal(
    container.querySelector<HTMLTextAreaElement>("#contact-message")!.value,
    "A valid contact message.",
  );
});

test("ambiguous failure preserves text, prevents resubmission, and copies the message", async () => {
  let requestCount = 0;
  let copied = "";
  Object.defineProperty(globalThis.navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async (value: string) => {
        copied = value;
      },
    },
  });
  globalThis.fetch = async () => {
    requestCount += 1;
    return Response.json({ status: "ambiguous" }, { status: 502 });
  };
  const { container, getByRole, getByText } = render(
    <ContactForm locale="en" />,
  );
  fillValidForm(container);
  const form = getByRole("form", { name: "Contact form" });

  fireEvent.submit(form);
  await waitFor(() => {
    getByText("Delivery could not be confirmed.");
  });

  const submit = getByRole("button", { name: "Send message" });
  assert.equal((submit as HTMLButtonElement).disabled, true);
  fireEvent.submit(form);
  assert.equal(requestCount, 1);

  fireEvent.click(getByRole("button", { name: "Copy message" }));
  await waitFor(() => {
    getByText("Message copied.");
  });
  assert.equal(copied, "A valid contact message.");
  assert.equal(
    container.querySelector<HTMLTextAreaElement>("#contact-message")!.value,
    "A valid contact message.",
  );
  getByText("Use one of the direct channels shown on this page.");
});

test("Croatian sending, accepted, rate-limited, and ambiguous states have parity", async () => {
  const scenarios = [
    {
      body: { status: "accepted" },
      expected: "Vaša je poruka prihvaćena za isporuku.",
      status: 200,
    },
    {
      body: { retryAfterSeconds: 60, status: "rate_limited" },
      expected:
        "Previše pokušaja. Pričekajte jednu minutu prije novog pokušaja.",
      status: 429,
    },
    {
      body: { status: "ambiguous" },
      expected: "Nije bilo moguće potvrditi isporuku.",
      status: 502,
    },
  ] as const;

  for (const scenario of scenarios) {
    cleanup();
    document.body.replaceChildren();
    globalThis.fetch = async () =>
      Response.json(scenario.body, { status: scenario.status });
    const { container, getByRole, getByText } = render(
      <ContactForm locale="hr" />,
    );
    fillValidForm(container);
    fireEvent.submit(
      getByRole("form", { name: "Kontaktni obrazac" }),
    );
    await waitFor(() => getByText(scenario.expected));
  }

  cleanup();
  document.body.replaceChildren();
  globalThis.fetch = async () => new Promise<Response>(() => {});
  const { container, getByRole } = render(<ContactForm locale="hr" />);
  fillValidForm(container);
  fireEvent.submit(
    getByRole("form", { name: "Kontaktni obrazac" }),
  );
  assert.equal(
    (getByRole("button", { name: "Slanje…" }) as HTMLButtonElement).disabled,
    true,
  );
});
