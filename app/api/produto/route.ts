import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { obterOperadorAutenticado } from "@/lib/auth/session";
import { AuthSecretNotConfiguredError } from "@/lib/auth/token";
import { MovimentacaoMotivo, MovimentacaoTipo } from "@prisma/client";

type ProdutoRecord = {
  id: number;
  nome: string;
  codigoBarras: string;
  precoUnitario: { toString(): string };
  qtdEstoque: number;
};

type ProdutoPayload = {
  id: number;
  nome: string;
  codigoBarras: string;
  precoUnitario: string;
  qtdEstoque: number;
};

type PostBody = {
  nome?: unknown;
  codigoBarras?: unknown;
  precoUnitario?: unknown;
  qtdEstoque?: unknown;
};

type PatchBody = {
  id?: unknown;
  qtdEstoque?: unknown;
};

function parsePreco(preco: unknown): string {
  if (typeof preco === "number" && Number.isFinite(preco)) {
    return preco.toFixed(2);
  }

  if (typeof preco === "string") {
    const normalized = preco.replace(/\s+/g, "").replace(/,/g, ".");
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) {
      throw new Error("Preço inválido");
    }
    return parsed.toFixed(2);
  }

  throw new Error("Preço inválido");
}

function parseQuantidade(qtd: unknown): number {
  if (typeof qtd === "number" && Number.isInteger(qtd)) {
    return qtd;
  }

  if (typeof qtd === "string") {
    const parsed = Number(qtd);
    if (Number.isInteger(parsed)) {
      return parsed;
    }
  }

  throw new Error("Quantidade inválida");
}

function parseId(id: unknown): number {
  const parsed = Number(id);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("Produto inválido");
  }

  return parsed;
}

export async function GET() {
  try {
    const operador = await obterOperadorAutenticado();

    if (!operador) {
      return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
    }

    const produtos = (await prisma.produto.findMany({
      orderBy: { nome: "asc" },
    })) as ProdutoRecord[];

    const payload: ProdutoPayload[] = produtos.map((produto) => ({
      id: produto.id,
      nome: produto.nome,
      codigoBarras: produto.codigoBarras,
      qtdEstoque: produto.qtdEstoque,
      precoUnitario: produto.precoUnitario.toString(),
    }));

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    if (error instanceof AuthSecretNotConfiguredError) {
      console.error("[api/produto] AUTH_SECRET ausente", error);
      return NextResponse.json(
        { message: "Configuração de segurança ausente. Informe AUTH_SECRET para habilitar o login." },
        { status: 500 },
      );
    }

    console.error("[api/produto] Falha ao listar produtos", error);
    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const operador = await obterOperadorAutenticado();

    if (!operador) {
      return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
    }

    const body = (await request.json()) as PostBody;

    const nome = typeof body.nome === "string" ? body.nome.trim() : "";
    const codigoBarras =
      typeof body.codigoBarras === "string" ? body.codigoBarras.trim() : "";
    const precoUnitario = parsePreco(body.precoUnitario);
    const qtdEstoque = parseQuantidade(body.qtdEstoque);

    if (!nome) {
      return NextResponse.json(
        { message: "Informe o nome do produto" },
        { status: 400 }
      );
    }

    if (!codigoBarras) {
      return NextResponse.json(
        { message: "Informe o código de barras" },
        { status: 400 }
      );
    }

    if (qtdEstoque < 0) {
      return NextResponse.json(
        { message: "Quantidade deve ser zero ou positiva" },
        { status: 400 }
      );
    }

    const produtoCriado = await prisma.$transaction(async (tx) => {
      const produto = await tx.produto.create({
        data: {
          nome,
          codigoBarras,
          precoUnitario,
          qtdEstoque,
        },
      });

      if (qtdEstoque > 0) {
        await tx.movimentacaoEstoque.create({
          data: {
            produtoId: produto.id,
            quantidade: qtdEstoque,
            tipo: MovimentacaoTipo.ENTRADA,
            motivo: MovimentacaoMotivo.CADASTRO,
          },
        });
      }

      return produto;
    });

    const payload: ProdutoPayload = {
      id: produtoCriado.id,
      nome: produtoCriado.nome,
      codigoBarras: produtoCriado.codigoBarras,
      qtdEstoque: produtoCriado.qtdEstoque,
      precoUnitario: produtoCriado.precoUnitario.toString(),
    };

    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    if (error instanceof AuthSecretNotConfiguredError) {
      console.error("[api/produto] AUTH_SECRET ausente", error);
      return NextResponse.json(
        { message: "Configuração de segurança ausente. Informe AUTH_SECRET para habilitar o login." },
        { status: 500 },
      );
    }

    console.error("[api/produto] Falha ao cadastrar produto", error);

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { message: "Já existe um produto com esse código de barras" },
        { status: 409 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const operador = await obterOperadorAutenticado();

    if (!operador) {
      return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
    }

    const body = (await request.json()) as PatchBody;

    const id = parseId(body.id);
    const qtdEstoque = parseQuantidade(body.qtdEstoque);

    if (qtdEstoque < 0) {
      return NextResponse.json(
        { message: "Quantidade deve ser zero ou positiva" },
        { status: 400 }
      );
    }

    const produtoAtualizado = await prisma.$transaction(async (tx) => {
      const produtoExistente = await tx.produto.findUnique({
        where: { id },
        select: { id: true, nome: true, qtdEstoque: true },
      });

      if (!produtoExistente) {
        throw new Error("Produto não encontrado");
      }

      const diferenca = qtdEstoque - produtoExistente.qtdEstoque;

      const atualizado = await tx.produto.update({
        where: { id },
        data: { qtdEstoque },
      });

      if (diferenca !== 0) {
        await tx.movimentacaoEstoque.create({
          data: {
            produtoId: atualizado.id,
            quantidade: Math.abs(diferenca),
            tipo: diferenca > 0 ? MovimentacaoTipo.ENTRADA : MovimentacaoTipo.SAIDA,
            motivo: MovimentacaoMotivo.AJUSTE_MANUAL,
          },
        });
      }

      return atualizado;
    });

    const payload: ProdutoPayload = {
      id: produtoAtualizado.id,
      nome: produtoAtualizado.nome,
      codigoBarras: produtoAtualizado.codigoBarras,
      qtdEstoque: produtoAtualizado.qtdEstoque,
      precoUnitario: produtoAtualizado.precoUnitario.toString(),
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    if (error instanceof AuthSecretNotConfiguredError) {
      console.error("[api/produto] AUTH_SECRET ausente", error);
      return NextResponse.json(
        { message: "Configuração de segurança ausente. Informe AUTH_SECRET para habilitar o login." },
        { status: 500 },
      );
    }

    console.error("[api/produto] Falha ao atualizar produto", error);


    if (error instanceof Error && error.message === "Produto não encontrado") {
      return NextResponse.json(
        { message: "Produto não encontrado" },
        { status: 404 }
      );
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2025"
    ) {
      return NextResponse.json(
        { message: "Produto não encontrado" },
        { status: 404 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
