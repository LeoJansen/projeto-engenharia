import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  const { codigo } = req.query;

  if (typeof codigo !== 'string') {
    return res.status(400).json({ message: 'Código de barras inválido' });
  }

  // --- Início da Lógica de Negócio ---
  try {
    // 1. Lógica: Buscar produto pelo código (RF03)
    const produto = await prisma.produto.findUnique({
      where: { codigoBarras: codigo },
    });

    // 2. Lógica: Produto existe?
    if (!produto) {
      return res.status(404).json({ message: 'Produto não encontrado' });
    }

    // 3. Lógica: Produto tem estoque?
    if (produto.qtdEstoque <= 0) {
      return res.status(400).json({ message: 'Produto fora de estoque' });
    }

    // 4. Lógica: Sucesso (RNF03 - Consulta rápida)
    res.status(200).json(produto);

  } catch (error) {
    console.error('[api/produto] Falha ao buscar produto', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
  // --- Fim da Lógica de Negócio ---
}