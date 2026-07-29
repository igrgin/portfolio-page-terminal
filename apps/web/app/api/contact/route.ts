import {
  createMemoryContactRateLimiter,
  type ContactRateLimiter,
} from "../../../lib/contact-form-handler";
import { createConfiguredContactFormHandler } from "../../../lib/contact-form-server";

let handler:
  | ((request: Request) => Promise<Response>)
  | null
  | undefined;
const rateLimiter: ContactRateLimiter = createMemoryContactRateLimiter();

function unavailableResponse(): Response {
  return Response.json(
    { status: "unavailable" },
    {
      headers: { "cache-control": "no-store" },
      status: 404,
    },
  );
}

export async function POST(request: Request): Promise<Response> {
  if (handler === undefined) {
    handler = createConfiguredContactFormHandler(
      process.env,
      rateLimiter,
    );
  }
  return handler ? handler(request) : unavailableResponse();
}
