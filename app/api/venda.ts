import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

// Tipo para os itens recebidos do front-end
type ItemVendaInput = {
  idProduto: number;
  quantidade: number;
};

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const {
    itens,
    tipoPagamento,
    idOperador
  } = req.body as {
    itens: ItemVendaInput[];
    tipoPagamento: string;
    idOperador: number;
  };

  // --- Início da Lógica de Negócio ---
  try {
    // 1. Lógica: Buscar os dados REAIS dos produtos (preço) no banco.
    // NUNCA confie nos preços enviados pelo front-end.
    const idsProdutos = itens.map((item) => item.idProduto);
    const produtosDB = await prisma.produto.findMany({
      where: { id: { in: idsProdutos } },
    });

    // 2. Lógica: Validar estoque e Calcular Total (RF02)
    let totalVendaCalculado = 0;
    const operacoesAtualizacaoEstoque = [];
    const dadosItensVenda = [];

    for (const item of itens) {
      const produto = produtosDB.find((p) => p.id === item.idProduto);

      if (!produto) {
        throw new Error(`Produto ID ${item.idProduto} não encontrado.`);
      }

      // 2a. Lógica: Validação de Estoque (RF04)
      if (produto.qtdEstoque < item.quantidade) {
        throw new Error(`Estoque insuficiente para ${produto.nome}.`);
      }

      // 2b. Lógica: Cálculo do Total (RF02)
      const precoMomento = produto.precoUnitario;
      totalVendaCalculado += Number(precoMomento) * item.quantidade;

      // 2c. Preparar dados para a transação
      dadosItensVenda.push({
        idProduto: item.idProduto,
        quantidade: item.quantidade,
        precoMomento: precoMomento,
      });

      // 2d. Preparar operação de baixa de estoque (RF04)
      operacoesAtualizacaoEstoque.push(
        prisma.produto.update({
          where: { id: item.idProduto },
          data: { qtdEstoque: { decrement: item.quantidade } },
        })
      );
    }

    // 3. Lógica: Executar a Transação Atômica (RF01, RF05, RF06)
    const vendaRegistrada = await prisma.$transaction([
      // 3a. Criar a Venda (RF05, RF06)
      prisma.venda.create({
        data: {
          totalVenda: totalVendaCalculado,
          tipoPagamento: tipoPagamento,
          idOperador: idOperador,
          // 3b. Criar os Itens da Venda (RF01)
          itens: {
            create: dadosItensVenda,
          },
        },
      }),
      // 3c. Baixar o Estoque (RF04)
      ...operacoesAtualizacaoEstoque,
    ]);

    // 4. Lógica: Sucesso
    res.status(201).json(vendaRegistrada[0]); // Retorna o objeto da Venda criada

  } catch (error: any) {
    // Se a transação falhar (ex: erro de estoque), o Prisma faz o rollback.
    res.status(400).json({ message: error.message || 'Erro ao processar venda' });
  }
  // --- Fim da Lógica de Negócio ---
}