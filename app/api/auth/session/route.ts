import { NextResponse } from "next/server";
import {
  obterOperadorAutenticado,
  type OperadorSessao,
} from "@/lib/auth/session";
import { AuthSecretNotConfiguredError } from "@/lib/auth/token";

export async function GET() {
  try {
    const operador = await obterOperadorAutenticado();

    if (!operador) {
      return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
    }

    const payload: OperadorSessao = {
      id: operador.id,
      nome: operador.nome,
      login: operador.login,
    };

    return NextResponse.json({ operador: payload }, { status: 200 });
  } catch (error) {
    if (error instanceof AuthSecretNotConfiguredError) {
      console.error("[api/auth/session] AUTH_SECRET ausente", error);
      return NextResponse.json(
        {
          message: "Configuração de segurança ausente. Informe AUTH_SECRET para habilitar o login.",
        },
        { status: 500 },
      );
    }

    console.error("[api/auth/session] Falha ao consultar sessão", error);
    return NextResponse.json({ message: "Erro interno do servidor" }, { status: 500 });
  }
}
