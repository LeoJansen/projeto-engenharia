import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
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

type VendaComRelacionamentos = Prisma.VendaGetPayload<{
  include: {
    operador: { select: { id: true; nome: true } };
    itens: {
      include: {
        produto: { select: { id: true; nome: true; codigoBarras: true } };
      };
    };
  };
}>;

type VendaSerializada = {
  id: number;
  dataHora: string;
  totalVenda: string;
  tipoPagamento: string;
  operador: { id: number; nome: string } | null;
  itens: Array<{
    id: number;
    quantidade: number;
    precoMomento: string;
    produto: { id: number; nome: string; codigoBarras: string } | null;
  }>;
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

const sanitizarInteiroPositivo = (
  valor: string | null,
  padrao: number,
  minimo: number,
  maximo: number
) => {
  if (!valor) {
    return padrao;
  }

  const numero = Number.parseInt(valor, 10);

  if (!Number.isFinite(numero) || Number.isNaN(numero)) {
    return padrao;
  }

  const limitado = Math.min(Math.max(numero, minimo), maximo);

  return limitado;
};

const serializarVenda = (venda: VendaComRelacionamentos): VendaSerializada => ({
  id: venda.id,
  dataHora: venda.dataHora.toISOString(),
  totalVenda: venda.totalVenda.toString(),
  tipoPagamento: venda.tipoPagamento,
  operador: venda.operador
    ? {
        id: venda.operador.id,
        nome: venda.operador.nome,
      }
    : null,
  itens: venda.itens.map((item) => ({
    id: item.id,
    quantidade: item.quantidade,
    precoMomento: item.precoMomento.toString(),
    produto: item.produto
      ? {
          id: item.produto.id,
          nome: item.produto.nome,
          codigoBarras: item.produto.codigoBarras,
        }
      : null,
  })),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limite = sanitizarInteiroPositivo(url.searchParams.get("limit"), 50, 1, 100);
    const pagina = sanitizarInteiroPositivo(url.searchParams.get("page"), 1, 1, 1000);
    const skip = (pagina - 1) * limite;

    const [vendasDB, totalizador, agrupamentoPagamento] = await Promise.all([
      prisma.venda.findMany({
        orderBy: { dataHora: "desc" },
        skip,
        take: limite,
        include: {
          operador: { select: { id: true, nome: true } },
          itens: {
            include: {
              produto: {
                select: {
                  id: true,
                  nome: true,
                  codigoBarras: true,
                },
              },
            },
          },
        },
      }),
      prisma.venda.aggregate({
        _sum: { totalVenda: true },
        _count: { _all: true },
        _min: { dataHora: true },
        _max: { dataHora: true },
      }),
      prisma.venda.groupBy({
        by: ["tipoPagamento"],
        _count: { _all: true },
        _sum: { totalVenda: true },
        orderBy: { tipoPagamento: "asc" },
      }),
    ]);

    const totalRegistros = totalizador._count._all ?? 0;
    const faturamentoTotalNumero = Number(totalizador._sum.totalVenda ?? 0);
    const ticketMedioNumero = totalRegistros > 0 ? faturamentoTotalNumero / totalRegistros : 0;
    const totalPaginas = totalRegistros === 0 ? 1 : Math.ceil(totalRegistros / limite);

    return NextResponse.json({
      vendas: vendasDB.map(serializarVenda),
      resumo: {
        totalVendas: totalRegistros,
        faturamentoTotal: faturamentoTotalNumero.toFixed(2),
        ticketMedio: ticketMedioNumero.toFixed(2),
        primeiraVenda: totalizador._min.dataHora?.toISOString() ?? null,
        ultimaVenda: totalizador._max.dataHora?.toISOString() ?? null,
        porPagamento: agrupamentoPagamento.map((registro) => ({
          tipoPagamento: registro.tipoPagamento,
          quantidade: registro._count._all,
          total: Number(registro._sum.totalVenda ?? 0).toFixed(2),
        })),
      },
      meta: {
        page: pagina,
        limit: limite,
        totalRegistros,
        totalPaginas,
      },
    });
  } catch (error) {
    console.error("[api/venda] Falha ao listar vendas", error);

    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Erro interno do servidor" }, { status: 500 });
  }
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

    let operadorIdUtilizado = idOperador;
    let operadorVerificado = await prisma.operador.findUnique({
      where: { id: idOperador },
      select: { id: true },
    });

    if (!operadorVerificado) {
      const operadorExistente = await prisma.operador.findFirst({
        orderBy: { id: "asc" },
        select: { id: true },
      });

      if (operadorExistente) {
        operadorIdUtilizado = operadorExistente.id;
        operadorVerificado = operadorExistente;
      } else {
        operadorVerificado = await prisma.operador.create({
          data: {
            nome: "Operador Padrão",
            login: "operador.padrao",
            senha: "123456",
          },
          select: { id: true },
        });
        operadorIdUtilizado = operadorVerificado.id;
      }
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
          idOperador: operadorIdUtilizado,
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
