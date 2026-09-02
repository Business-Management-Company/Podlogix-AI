"use client";

import { createContext, useContext } from "react";

/** True once the loading screen has finished and the hero may play. */
export const IntroContext = createContext<boolean>(false);

export function useIntroReady(): boolean {
  return useContext(IntroContext);
}
