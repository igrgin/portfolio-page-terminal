"use client";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import type { ComponentProps } from "react";

import { prependClassName } from "../../lib/class-names";

export type ScaffoldButtonProps = ComponentProps<typeof ButtonPrimitive>;

export function Button({ className, ...props }: ScaffoldButtonProps) {
  return (
    <ButtonPrimitive
      className={prependClassName("tui-button-scaffold", className)}
      data-slot="button"
      {...props}
    />
  );
}
