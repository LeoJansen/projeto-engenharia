import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE_NAME = "sabor_session";
const PUBLIC_PATHS = new Set(["/login"]);

const isPublicPath = (pathname: string) => {
  if (PUBLIC_PATHS.has(pathname)) {
    return true;
  }

  for (const publicPath of PUBLIC_PATHS) {
    if (pathname.startsWith(`${publicPath}/`)) {
      return true;
    }
  }

  return false;
};

const base64UrlToUint8Array = (value: string): Uint8Array => {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (base64.length % 4)) % 4;
  const normalized = base64 + "=".repeat(padding);
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
};

const parsePayload = (payloadBase64: string) => {
  try {
    const bytes = base64UrlToUint8Array(payloadBase64);
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json) as unknown;
  } catch (error) {
    console.error("[middleware/auth] Falha ao decodificar payload", error);
    return null;
  }
};

const validarAssinatura = async (payloadBase64: string, assinaturaBase64: string, segredo: string) => {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(segredo);
    const assinatura = base64UrlToUint8Array(assinaturaBase64);

    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );

    const valido = await crypto.subtle.verify(
      "HMAC",
      key,
      assinatura.buffer,
      encoder.encode(payloadBase64),
    );

    return valido;
  } catch (error) {
    console.error("[middleware/auth] Falha ao validar assinatura", error);
    return false;
  }
};

const validarToken = async (token: string, segredo: string) => {
  const [payloadBase64, assinaturaBase64] = token.split(".");

  if (!payloadBase64 || !assinaturaBase64) {
    return null;
  }

  const assinaturaValida = await validarAssinatura(payloadBase64, assinaturaBase64, segredo);

  if (!assinaturaValida) {
    return null;
  }

  const payload = parsePayload(payloadBase64);

  if (
    typeof payload !== "object" ||
    payload === null ||
    typeof (payload as { sub?: unknown }).sub !== "number" ||
    typeof (payload as { nome?: unknown }).nome !== "string" ||
    typeof (payload as { login?: unknown }).login !== "string" ||
    typeof (payload as { exp?: unknown }).exp !== "number" ||
    typeof (payload as { v?: unknown }).v !== "number" ||
    (payload as { v: number }).v !== 1
  ) {
    return null;
  }

  const agora = Math.floor(Date.now() / 1000);

  if ((payload as { exp: number }).exp <= agora) {
    return null;
  }

  return payload as {
    sub: number;
    nome: string;
    login: string;
    exp: number;
    iat: number;
  };
};

const redirectToLogin = (request: NextRequest) => {
  const loginUrl = new URL("/login", request.url);
  const redirectDestino = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  loginUrl.searchParams.set("redirect", redirectDestino);
  return NextResponse.redirect(loginUrl);
};

const redirectToHome = (request: NextRequest) => NextResponse.redirect(new URL("/", request.url));

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/assets") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    return NextResponse.next();
  }

  const segredo = process.env.AUTH_SECRET;

  if (!segredo) {
    console.error("[middleware/auth] AUTH_SECRET não configurada");
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value ?? "";
  const tokenValido = token ? await validarToken(token, segredo) : null;

  if (isPublicPath(pathname)) {
    if (tokenValido && pathname.startsWith("/login")) {
      return redirectToHome(request);
    }

    return NextResponse.next();
  }

  if (!tokenValido) {
    return redirectToLogin(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|assets).*)"],
};
