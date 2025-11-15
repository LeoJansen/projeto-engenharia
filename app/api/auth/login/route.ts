import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type PostBody = {
  login?: unknown;
  senha?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PostBody;
    const login = typeof body.login === "string" ? body.login.trim() : "";
    const senha = typeof body.senha === "string" ? body.senha : "";

    if (!login || !senha) {
      return NextResponse.json(
        { message: "Credenciais inválidas" },
        { status: 400 }
      );
    }

    const operador = await prisma.operador.findUnique({
      where: { login },
    });

    if (!operador) {
      return NextResponse.json(
        { message: "Operador não encontrado" },
        { status: 404 }
      );
    }

    const senhaValida = operador.senha === senha;

    if (!senhaValida) {
      return NextResponse.json(
        { message: "Senha incorreta" },
        { status: 401 }
      );
    }

    return NextResponse.json({ id: operador.id, nome: operador.nome }, { status: 200 });
  } catch (error) {
    console.error("[api/auth/login] Erro ao autenticar operador", error);
    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
