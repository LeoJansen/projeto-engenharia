import type { Metadata } from "next";
import { GeistSans, GeistMono } from "geist/font";
import { AuthProvider } from "@/components/auth/auth-provider";
import { Topbar } from "@/components/layout/topbar";
import { obterOperadorAutenticado } from "@/lib/auth/session";
import { AuthSecretNotConfiguredError } from "@/lib/auth/token";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sabor express",
  description: "Projeto Integrador de Engenharia de Software",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let operador = null;

  try {
    operador = await obterOperadorAutenticado();
  } catch (error) {
    if (error instanceof AuthSecretNotConfiguredError) {
      throw new Error(
        "AUTH_SECRET não está configurada. Defina a variável de ambiente para habilitar o login.",
      );
    }

    throw error;
  }

  const authKey = operador ? `operador-${operador.id}` : "anonimo";

  return (
    <html lang="en">
      <body className={`${GeistSans.variable} ${GeistMono.variable} bg-slate-50 text-slate-900 antialiased`}>
        <AuthProvider key={authKey} initialOperador={operador}>
          <div className="flex min-h-screen flex-col">
            <Topbar />
            <main className="flex-1">{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
