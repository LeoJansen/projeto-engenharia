import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  gerarTokenSessao,
  montarCookieSessao,
  type OperadorSessao,
} from "@/lib/auth/session";
import { AuthSecretNotConfiguredError } from "@/lib/auth/token";

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

    const operadorSessao: OperadorSessao = {
      id: operador.id,
      nome: operador.nome,
      login: operador.login,
    };

    try {
      const token = gerarTokenSessao(operadorSessao);
      const resposta = NextResponse.json(
        {
          operador: operadorSessao,
        },
        { status: 200 },
      );

      resposta.cookies.set(montarCookieSessao(token));
      return resposta;
    } catch (error) {
      if (error instanceof AuthSecretNotConfiguredError) {
        console.error("[api/auth/login] AUTH_SECRET ausente", error);
        return NextResponse.json(
          {
            message:
              "Configuração de segurança ausente. Informe AUTH_SECRET para habilitar o login.",
          },
          { status: 500 },
        );
      }

      throw error;
    }
  } catch (error) {
    console.error("[api/auth/login] Erro ao autenticar operador", error);
    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
