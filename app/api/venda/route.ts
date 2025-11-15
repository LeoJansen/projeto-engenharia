import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type ItemVendaInput = {
  idProduto: number;
  quantidade: number;
};

type PostBody = {
  itens?: unknown;
  tipoPagamento?: unknown;
  idOperador?: unknown;
};

function validarItens(payload: unknown): ItemVendaInput[] {
  if (!Array.isArray(payload) || payload.length === 0) {
    throw new Error("Adicione pelo menos um item antes de finalizar a venda");
  }

  return payload.map((item) => {
    if (
      typeof item !== "object" ||
      item === null ||
      !("idProduto" in item) ||
      !("quantidade" in item)
    ) {
      throw new Error("Item da venda inválido");
    }

    const idProduto = Number((item as { idProduto: unknown }).idProduto);
    const quantidade = Number((item as { quantidade: unknown }).quantidade);

    if (!Number.isInteger(idProduto) || idProduto <= 0) {
      throw new Error("Produto inválido");
    }

    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      throw new Error("Quantidade inválida");
    }

    return { idProduto, quantidade };
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PostBody;

    const itens = validarItens(body.itens);
    const tipoPagamento =
      typeof body.tipoPagamento === "string" && body.tipoPagamento.trim()
        ? body.tipoPagamento.trim()
        : "Dinheiro";
    const idOperador = Number(body.idOperador ?? 1);

    if (!Number.isInteger(idOperador) || idOperador <= 0) {
      return NextResponse.json(
        { message: "Operador inválido" },
        { status: 400 }
      );
    }

    const idsProdutos = itens.map((item) => item.idProduto);
    const produtosDB = await prisma.produto.findMany({
      where: { id: { in: idsProdutos } },
    });

    let totalVendaCalculado = 0;

    const dadosItensVenda = itens.map((item) => {
      const produto = produtosDB.find((p) => p.id === item.idProduto);

      if (!produto) {
        throw new Error(`Produto ID ${item.idProduto} não encontrado.`);
      }

      if (produto.qtdEstoque < item.quantidade) {
        throw new Error(`Estoque insuficiente para ${produto.nome}.`);
      }

      const precoMomento = produto.precoUnitario.toString();
      totalVendaCalculado += Number(precoMomento) * item.quantidade;

      return {
        idProduto: item.idProduto,
        quantidade: item.quantidade,
        precoMomento,
      };
    });

    const vendaRegistrada = await prisma.$transaction(async (tx) => {
      for (const item of itens) {
        await tx.produto.update({
          where: { id: item.idProduto },
          data: { qtdEstoque: { decrement: item.quantidade } },
        });
      }

      return tx.venda.create({
        data: {
          totalVenda: totalVendaCalculado,
          tipoPagamento,
          idOperador,
          itens: {
            create: dadosItensVenda,
          },
        },
        include: {
          itens: true,
        },
      });
    });

    return NextResponse.json(vendaRegistrada, { status: 201 });
  } catch (error) {
    console.error("[api/venda] Falha ao processar venda", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: "Erro interno do servidor" }, { status: 500 });
  }
}
