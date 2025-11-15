import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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
    console.error("[api/produto/codigo] Falha ao buscar produto", error);
    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
