import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
// Em um app real, use 'bcrypt' para comparar senhas
// import bcrypt from 'bcrypt'; 

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { login, senha } = req.body;

  // --- Início da Lógica de Negócio ---
  try {
    const operador = await prisma.operador.findUnique({
      where: { login: login },
    });

    // 1. Lógica: O operador existe?
    if (!operador) {
      return res.status(404).json({ message: 'Operador não encontrado' });
    }

    // 2. Lógica: A senha está correta? (RNF01)
    // const senhaValida = await bcrypt.compare(senha, operador.senha); // Versão com hash
    const senhaValida = operador.senha === senha; // Versão simples

    if (!senhaValida) {
      return res.status(401).json({ message: 'Senha incorreta' });
    }
    
    // 3. Lógica: Sucesso.
    // (Aqui você criaria uma sessão ou JWT)
    res.status(200).json({ id: operador.id, nome: operador.nome });

  } catch (error) {
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
  // --- Fim da Lógica de Negócio ---
}