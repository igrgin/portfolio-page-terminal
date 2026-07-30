import { createDraftAccessToken } from "../apps/web/lib/draft-session";

const [revision, ttlArgument] = process.argv.slice(2);
const secret = process.env.DRAFT_MODE_SECRET;

if (!secret) {
  throw new Error("Set DRAFT_MODE_SECRET before generating Draft Mode access.");
}
if (!revision) {
  throw new Error(
    "Pass the 64-character validated Publication batch revision.",
  );
}
const ttlSeconds = ttlArgument === undefined ? 900 : Number(ttlArgument);
const token = await createDraftAccessToken(secret, revision, { ttlSeconds });
process.stdout.write(`${token}\n`);
