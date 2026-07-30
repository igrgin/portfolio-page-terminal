import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  draftApplicationMetadata,
  renderDraftApplicationPage,
} from "../../../../../lib/draft-application";
import { loadDraftRequestContext } from "../../../../../lib/draft-request";

type DraftRouteProps = Readonly<{
  params: Promise<Readonly<{ path?: string[] }>>;
}>;

export async function generateMetadata({
  params,
}: DraftRouteProps): Promise<Metadata> {
  const [context, { path }] = await Promise.all([
    loadDraftRequestContext(),
    params,
  ]);
  return context
    ? draftApplicationMetadata("en", path, context)
    : {
        robots: { follow: false, index: false, nocache: true },
        title: "Draft Mode access required",
      };
}

export default async function EnglishDraftPage({
  params,
}: DraftRouteProps) {
  const [context, { path }] = await Promise.all([
    loadDraftRequestContext(),
    params,
  ]);
  if (!context) {
    redirect("/draft?expired=1");
  }
  return renderDraftApplicationPage("en", path, context);
}
