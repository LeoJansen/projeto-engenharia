import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";

type ProdutoRecord = {
  id: number;
  nome: string;
  codigoBarras: string;
  precoUnitario: { toString(): string };
  qtdEstoque: number;
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

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      const produtos = (await prisma.produto.findMany({
        orderBy: { nome: "asc" },
      })) as ProdutoRecord[];

      const payload = produtos.map((produto: ProdutoRecord) => {
        const { id, nome, codigoBarras, precoUnitario, qtdEstoque } = produto;
        return {
          id,
          nome,
          codigoBarras,
          qtdEstoque,
          precoUnitario: precoUnitario.toString(),
        };
      });

      return res.status(200).json(payload);
    } catch (error) {
      console.error("[api/produto] Falha ao listar produtos", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  }

  if (req.method === "POST") {
    try {
      const nome = typeof req.body?.nome === "string" ? req.body.nome.trim() : "";
      const codigoBarras = typeof req.body?.codigoBarras === "string" ? req.body.codigoBarras.trim() : "";
      const precoUnitario = parsePreco(req.body?.precoUnitario);
      const qtdEstoque = parseQuantidade(req.body?.qtdEstoque);

      if (!nome) {
        return res.status(400).json({ message: "Informe o nome do produto" });
      }

      if (!codigoBarras) {
        return res.status(400).json({ message: "Informe o código de barras" });
      }

      if (qtdEstoque < 0) {
        return res.status(400).json({ message: "Quantidade deve ser zero ou positiva" });
      }

      const produtoCriado = await prisma.produto.create({
        data: {
          nome,
          codigoBarras,
          precoUnitario,
          qtdEstoque,
        },
      });

      return res.status(201).json({
        ...produtoCriado,
        precoUnitario: produtoCriado.precoUnitario.toString(),
      });
    } catch (error) {
      console.error("[api/produto] Falha ao cadastrar produto", error);

      if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002") {
        return res.status(409).json({ message: "Já existe um produto com esse código de barras" });
      }

      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }

      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ message: "Method Not Allowed" });
}
