import { createHmac, timingSafeEqual } from "node:crypto";

export const AUTH_COOKIE_NAME = "sabor_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 horas

export type AuthTokenPayload = {
  sub: number;
  nome: string;
  login: string;
  iat: number;
  exp: number;
  v: 1;
};

export class AuthSecretNotConfiguredError extends Error {
  constructor() {
    super(
      "AUTH_SECRET não está configurada. Defina a variável de ambiente AUTH_SECRET para habilitar o mecanismo de login.",
    );
    this.name = "AuthSecretNotConfiguredError";
  }
}

const obterSegredo = () => {
  const segredo = process.env.AUTH_SECRET;

  if (!segredo || !segredo.trim()) {
    throw new AuthSecretNotConfiguredError();
  }

  return segredo;
};

const assinar = (payloadCodificado: string, segredo: string) =>
  createHmac("sha256", segredo).update(payloadCodificado).digest();

export const criarToken = (payload: AuthTokenPayload): string => {
  const segredo = obterSegredo();
  const payloadCodificado = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const assinatura = assinar(payloadCodificado, segredo).toString("base64url");

  return `${payloadCodificado}.${assinatura}`;
};

export const validarToken = (token: string): AuthTokenPayload | null => {
  try {
    const segredo = obterSegredo();
    const [payloadCodificado, assinaturaRecebida] = token.split(".");

    if (!payloadCodificado || !assinaturaRecebida) {
      return null;
    }

    const assinaturaEsperada = assinar(payloadCodificado, segredo);
    const assinaturaRecebidaBuffer = Buffer.from(assinaturaRecebida, "base64url");

    if (assinaturaEsperada.length !== assinaturaRecebidaBuffer.length) {
      return null;
    }

    if (!timingSafeEqual(assinaturaEsperada, assinaturaRecebidaBuffer)) {
      return null;
    }

    const payloadJson = Buffer.from(payloadCodificado, "base64url").toString("utf8");
    const payload = JSON.parse(payloadJson) as Partial<AuthTokenPayload>;

    if (
      typeof payload !== "object" ||
      payload === null ||
      typeof payload.sub !== "number" ||
      typeof payload.nome !== "string" ||
      typeof payload.login !== "string" ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number" ||
      payload.v !== 1
    ) {
      return null;
    }

    const agora = Math.floor(Date.now() / 1000);

    if (payload.exp <= agora) {
      return null;
    }

    return payload as AuthTokenPayload;
  } catch (error) {
    if (error instanceof AuthSecretNotConfiguredError) {
      throw error;
    }

    console.error("[auth/token] Falha ao validar token", error);
    return null;
  }
};
