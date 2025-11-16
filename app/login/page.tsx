import { redirect } from "next/navigation";
import { AuthSecretNotConfiguredError } from "@/lib/auth/token";
import { obterOperadorAutenticado } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

type SearchParams = Record<string, string | string[] | undefined>;

type LoginPageProps = {
  searchParams?: SearchParams | Promise<SearchParams>;
};

const resolverSearchParams = async (
  searchParams: LoginPageProps["searchParams"],
): Promise<SearchParams> => {
  if (!searchParams) {
    return {};
  }

  if (typeof (searchParams as Promise<SearchParams>).then === "function") {
    return (await searchParams) ?? {};
  }

  return searchParams;
};

const sanitizarDestino = (destino?: string | string[] | undefined) => {
  if (typeof destino !== "string") {
    return "/";
  }

  if (!destino.startsWith("/")) {
    return "/";
  }

  // Evita URLs do tipo //dominio.com
  if (destino.startsWith("//")) {
    return "/";
  }

  return destino;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await resolverSearchParams(searchParams);
  const destino = sanitizarDestino(params.redirect);

  try {
    const operador = await obterOperadorAutenticado();

    if (operador) {
      redirect(destino);
    }
  } catch (error) {
    if (error instanceof AuthSecretNotConfiguredError) {
      throw new Error("AUTH_SECRET não está configurada. Defina a variável de ambiente para habilitar o login.");
    }

    throw error;
  }

  return <LoginForm redirectTo={destino} />;
}
