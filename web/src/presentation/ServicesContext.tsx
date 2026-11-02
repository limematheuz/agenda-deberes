import { createContext, useContext, type ReactNode } from "react";
import type { Services } from "../domain/ports";

const Ctx = createContext<Services | null>(null);

export function ServicesProvider({ services, children }: { services: Services; children: ReactNode }) {
  return <Ctx.Provider value={services}>{children}</Ctx.Provider>;
}

export function useServices(): Services {
  const s = useContext(Ctx);
  if (!s) throw new Error("Falta ServicesProvider");
  return s;
}
