import type { Destination } from "../lib/routing";
import React from "react";

const iconPaths: Readonly<Record<Exclude<Destination, "privacy">, string>> = {
  about: "M5.5 19c.8-3.55 3-5.35 6.5-5.35s5.7 1.8 6.5 5.35",
  contact: "M4.5 7 12 13l7.5-6",
  education: "m3 9 9-4 9 4-9 4-9-4Zm3.5 2v4.5c2.8 2.25 8.2 2.25 11 0V11",
  experience: "M3.5 12.25c5.2 2.2 11.8 2.2 17 0M8.5 7V5.5h7V7",
  projects: "M3.5 6.5h6l1.75 2H20.5v9.5H3.5zM3.5 9h17",
  skills: "m8.5 6-5 6 5 6M15.5 6l5 6-5 6M13.5 4l-3 16",
};

export function NavIcon({
  destination,
}: Readonly<{ destination: Exclude<Destination, "privacy"> }>) {
  return (
    <svg
      aria-hidden="true"
      className="nav-icon"
      fill="none"
      focusable="false"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
    >
      {destination === "about" && <circle cx="12" cy="8" r="3.25" />}
      {destination === "experience" && (
        <rect height="12" rx="1.5" width="17" x="3.5" y="7" />
      )}
      {destination === "contact" && (
        <rect height="13" rx="1.5" width="17" x="3.5" y="5.5" />
      )}
      <path d={iconPaths[destination]} />
    </svg>
  );
}
