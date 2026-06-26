import React, { type ReactNode } from "react";

type Props = { children: ReactNode };

export function DatabaseProvider({ children }: Props) {
  return <>{children}</>;
}
