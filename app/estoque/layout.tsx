import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AuthSecretNotConfiguredError } from "@/lib/auth/token";
import { obterOperadorAutenticado } from "@/lib/auth/session";
import { AuthProvider } from "@/components/auth/auth-provider";

export default async function EstoqueLayout({ children }: { children: ReactNode }) {
  let operador = null;

  try {
    operador = await obterOperadorAutenticado();
  } catch (error) {
    if (error instanceof AuthSecretNotConfiguredError) {
      throw new Error("AUTH_SECRET não está configurada. Defina a variável de ambiente para habilitar o login.");
    }

    throw error;
  }

  if (!operador) {
    redirect(`/login?redirect=${encodeURIComponent("/estoque")}`);
  }

  return <AuthProvider initialOperador={operador}>{children}</AuthProvider>;
}
