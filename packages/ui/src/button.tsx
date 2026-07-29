"use client";

import type { ComponentProps } from "react";

import { Button as ScaffoldButton } from "./components/ui/button";
import { prependClassName } from "./lib/class-names";

export type ButtonProps = ComponentProps<typeof ScaffoldButton> & {
  tone?: "accent" | "neutral" | "danger";
};

export function Button({
  className,
  tone = "accent",
  ...props
}: ButtonProps) {
  return (
    <ScaffoldButton
      className={prependClassName("tui-button", className)}
      data-tone={tone}
      {...props}
    />
  );
}
