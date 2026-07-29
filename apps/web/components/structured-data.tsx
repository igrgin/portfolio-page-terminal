import React from "react";

export function StructuredData({ value }: Readonly<{ value: unknown }>) {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(value).replaceAll("<", "\\u003c"),
      }}
      type="application/ld+json"
    />
  );
}
