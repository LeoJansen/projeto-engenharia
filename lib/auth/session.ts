import { cookies } from "next/headers";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";
import prisma from "@/lib/prisma";
import {
  AUTH_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  AuthTokenPayload,
  AuthSecretNotConfiguredError,
  criarToken,
  validarToken,
} from "./token";

export type OperadorSessao = {
  id: number;
  nome: string;
  login: string;
};

const criarPayload = (operador: OperadorSessao): AuthTokenPayload => {
  const agora = Math.floor(Date.now() / 1000);

  return {
    sub: operador.id,
    nome: operador.nome,
    login: operador.login,
    iat: agora,
    exp: agora + SESSION_MAX_AGE_SECONDS,
    v: 1,
  };
};

export const gerarTokenSessao = (operador: OperadorSessao): string => {
  const payload = criarPayload(operador);
  return criarToken(payload);
};

export const montarCookieSessao = (token: string): ResponseCookie => ({
  name: AUTH_COOKIE_NAME,
  value: token,
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: SESSION_MAX_AGE_SECONDS,
  path: "/",
});

export const montarCookieSessaoExpirada = (): ResponseCookie => ({
  name: AUTH_COOKIE_NAME,
  value: "",
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 0,
  path: "/",
});

export const obterOperadorAutenticado = async (): Promise<OperadorSessao | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  let payload: AuthTokenPayload | null = null;

  try {
    payload = validarToken(token);
  } catch (error) {
    if (error instanceof AuthSecretNotConfiguredError) {
      throw error;
    }

    console.error("[auth/session] Falha ao validar token", error);
    payload = null;
  }

  if (!payload) {
    return null;
  }

  const operador = await prisma.operador.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      nome: true,
      login: true,
    },
  });

  if (!operador) {
    return null;
  }

  return operador;
};
