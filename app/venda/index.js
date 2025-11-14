// (imports: useState, useEffect, useMemo, useRouter)
// (import do tipo Produto do Prisma: import { Produto } from '@prisma/client')

type ItemCarrinho = Produto & { quantidade: number };

export default function Pdv() {
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [codigo, setCodigo] = useState('');

  // --- Lógica de Apresentação (RF02) ---
  const totalCalculado = useMemo(() => {
    return itens.reduce((acc, item) => {
      return acc + Number(item.precoUnitario) * item.quantidade;
    }, 0);
  }, [itens]);
  // --- Fim da Lógica de Apresentação ---

  // Lógica de Interação: Buscar Produto
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/produto/${codigo}`);
      if (!res.ok) {
        // Lógica: Mostrar erro (ex: "Produto não encontrado")
        return;
      }
      const produto = await res.json() as Produto;

      // Lógica: Adicionar ao carrinho (ou incrementar quantidade)
      setItens((prevItens) => {
        // ... (lógica para adicionar ou incrementar) ...
        return [...prevItens, { ...produto, quantidade: 1 }]; // Exemplo simples
      });
      setCodigo('');
    } catch (error) {
      // ...
    }
  };
  
  // Lógica de Interação: Finalizar Venda
  const handleFinalizarVenda = async (tipoPagamento: string) => {
    const payload = {
      itens: itens.map(item => ({ idProduto: item.id, quantidade: item.quantidade })),
      tipoPagamento: tipoPagamento,
      idOperador: 1 // (Você pegaria isso da sessão/login)
    };

    try {
      const res = await fetch('/api/venda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // Lógica: Mostrar erro (ex: "Estoque insuficiente")
        return;
      }
      
      // Lógica: Sucesso
      alert('Venda registrada!');
      setItens([]); // Limpa o carrinho
      
    } catch (error) {
      // ...
    }
  };

  // Retorne o JSX estilizado com Tailwind
  return (
    <div className="p-4">
      {/* ... */}
      <form onSubmit={handleBarcodeSubmit}>
        <input 
          type="text" 
          value={codigo} 
          onChange={(e) => setCodigo(e.target.value)}
          className="border p-2"
        />
      </form>
      {/* ... (Lista de itens) ... */}
      <div className="text-2xl font-bold">
        Total: {totalCalculado.toFixed(2)}
      </div>
      <button 
        onClick={() => handleFinalizarVenda('Dinheiro')}
        className="bg-blue-500 text-white p-2 rounded"
      >
        Finalizar Venda
      </button>
    </div>
  );
}