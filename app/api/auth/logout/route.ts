import { NextResponse } from "next/server";
import { montarCookieSessaoExpirada } from "@/lib/auth/session";

export async function POST() {
  const resposta = NextResponse.json({ success: true }, { status: 200 });
  resposta.cookies.set(montarCookieSessaoExpirada());
  return resposta;
}
