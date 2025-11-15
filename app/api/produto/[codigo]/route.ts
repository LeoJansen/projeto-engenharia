import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { obterOperadorAutenticado } from "@/lib/auth/session";
import { AuthSecretNotConfiguredError } from "@/lib/auth/token";

type RouteContext = {
  params: Promise<{
    codigo: string;
  }>;
};

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { codigo } = await params;

  if (!codigo) {
    return NextResponse.json(
      { message: "Código de barras inválido" },
      { status: 400 }
    );
  }

  try {
    const operador = await obterOperadorAutenticado();

    if (!operador) {
      return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
    }

    const produto = await prisma.produto.findUnique({
      where: { codigoBarras: codigo },
    });

    if (!produto) {
      return NextResponse.json(
        { message: "Produto não encontrado" },
        { status: 404 }
      );
    }

    if (produto.qtdEstoque <= 0) {
      return NextResponse.json(
        { message: "Produto fora de estoque" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ...produto,
      precoUnitario: produto.precoUnitario.toString(),
    });
  } catch (error) {
    if (error instanceof AuthSecretNotConfiguredError) {
      console.error("[api/produto/codigo] AUTH_SECRET ausente", error);
      return NextResponse.json(
        { message: "Configuração de segurança ausente. Informe AUTH_SECRET para habilitar o login." },
        { status: 500 },
      );
    }

    console.error("[api/produto/codigo] Falha ao buscar produto", error);
    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
