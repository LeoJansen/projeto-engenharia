'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { OperadorSessao } from "@/lib/auth/session";

type AuthContextValue = {
  operador: OperadorSessao | null;
  isAutenticado: boolean;
  setOperador: (operador: OperadorSessao | null) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  initialOperador: OperadorSessao | null;
  children: ReactNode;
};

export function AuthProvider({ initialOperador, children }: AuthProviderProps) {
  const [operador, setOperador] = useState<OperadorSessao | null>(initialOperador);

  const value = useMemo<AuthContextValue>(
    () => ({
      operador,
      isAutenticado: Boolean(operador),
      setOperador,
    }),
    [operador],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const contexto = useContext(AuthContext);

  if (!contexto) {
    throw new Error("useAuth deve ser utilizado dentro de um AuthProvider");
  }

  return contexto;
};
