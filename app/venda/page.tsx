'use client';

import Link from "next/link";
import { useMemo, useState } from "react";

type ProdutoResponse = {
  id: number;
  nome: string;
  codigoBarras: string;
  precoUnitario: number | string;
};

type ItemCarrinho = Omit<ProdutoResponse, "precoUnitario"> & {
  precoUnitario: number;
  quantidade: number;
};

type ApiError = {
  message?: string;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);

export default function VendaPage() {
  const [codigo, setCodigo] = useState("");
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [formaPagamento, setFormaPagamento] = useState("Dinheiro");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [carregandoProduto, setCarregandoProduto] = useState(false);
  const [finalizandoVenda, setFinalizandoVenda] = useState(false);

  const totalCalculado = useMemo(
    () =>
      itens.reduce((acc, item) => acc + item.precoUnitario * item.quantidade, 0),
    [itens]
  );

  const totalItens = useMemo(
    () => itens.reduce((acc, item) => acc + item.quantidade, 0),
    [itens]
  );

  const normalizarProduto = (produto: ProdutoResponse): ItemCarrinho => {
    const precoNumero =
      typeof produto.precoUnitario === "string"
        ? Number(produto.precoUnitario)
        : produto.precoUnitario;

    if (Number.isNaN(precoNumero)) {
      throw new Error("Preço do produto inválido");
    }

    return {
      id: produto.id,
      nome: produto.nome,
      codigoBarras: produto.codigoBarras,
      precoUnitario: precoNumero,
      quantidade: 1,
    };
  };

  const adicionarOuIncrementarItem = (produto: ItemCarrinho) => {
    setItens((prev) => {
      const existente = prev.findIndex((item) => item.id === produto.id);

      if (existente !== -1) {
        const copia = structuredClone(prev);
        copia[existente].quantidade += 1;
        return copia;
      }

      return [...prev, produto];
    });
  };

  const atualizarQuantidade = (idProduto: number, delta: number) => {
    setItens((prev) => {
      const copia = structuredClone(prev);
      const index = copia.findIndex((item) => item.id === idProduto);

      if (index === -1) {
        return prev;
      }

      const novaQuantidade = copia[index].quantidade + delta;

      if (novaQuantidade <= 0) {
        return copia.filter((item) => item.id !== idProduto);
      }

      copia[index].quantidade = novaQuantidade;
      return copia;
    });
  };

  const removerItem = (idProduto: number) => {
    setItens((prev) => prev.filter((item) => item.id !== idProduto));
  };

  const handleBarcodeSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const codigoLimpo = codigo.trim();

    if (!codigoLimpo) {
      setErro("Informe um código de barras para pesquisar");
      return;
    }

    setErro(null);
    setSucesso(null);
    setCarregandoProduto(true);

    try {
      const resposta = await fetch(`/api/produto/${encodeURIComponent(codigoLimpo)}`);
      const dados = (await resposta.json().catch(() => null)) as ProdutoResponse & ApiError | null;

      if (!resposta.ok || !dados) {
        throw new Error(dados?.message ?? "Produto não encontrado");
      }

      const produtoNormalizado = normalizarProduto(dados);
      adicionarOuIncrementarItem(produtoNormalizado);
      setCodigo("");
    } catch (error) {
      console.error("[pdv] Falha ao buscar produto", error);
      setErro(error instanceof Error ? error.message : "Não foi possível buscar o produto");
    } finally {
      setCarregandoProduto(false);
    }
  };

  const handleFinalizarVenda = async () => {
    if (!itens.length) {
      setErro("Adicione pelo menos um item antes de finalizar a venda");
      return;
    }

    setErro(null);
    setSucesso(null);
    setFinalizandoVenda(true);

    const payload = {
      itens: itens.map((item) => ({ idProduto: item.id, quantidade: item.quantidade })),
      tipoPagamento: formaPagamento,
      idOperador: 1,
    };

    try {
      const resposta = await fetch("/api/venda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!resposta.ok) {
        const dados = (await resposta.json().catch(() => null)) as ApiError | null;
        throw new Error(dados?.message ?? "Não foi possível registrar a venda");
      }

      setItens([]);
      setSucesso("Venda registrada com sucesso!");
    } catch (error) {
      console.error("[pdv] Falha ao finalizar venda", error);
      setErro(error instanceof Error ? error.message : "Não foi possível finalizar a venda");
    } finally {
      setFinalizandoVenda(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-linear-to-br from-white via-white to-[#fff4d6] font-sans text-[#2f1b0c] antialiased">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12 sm:px-10 lg:px-16">
        <header className="flex flex-col gap-6">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#d62828]/80 transition hover:text-[#d62828]"
          >
            ← voltar para o início
          </Link>
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f4a226]">
              PDV · Registro de vendas
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-[#d62828] sm:text-5xl">
              Finalize pedidos com praticidade e controle
            </h1>
            <p className="max-w-3xl text-base text-[#8c5315]">
              Utilize o leitor de código de barras, organize o combo em tempo real e feche a operação com segurança.
            </p>
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          <div className="flex flex-col gap-8">
            <form
              onSubmit={handleBarcodeSubmit}
              className="rounded-3xl border border-[#ffd166] bg-white/90 p-6 shadow-[0_20px_60px_-40px_rgba(214,40,40,0.55)]"
            >
              <label htmlFor="codigo-barras" className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-[#d62828]">
                  Código de barras
                </span>
                <div className="flex items-center gap-3">
                  <input
                    id="codigo-barras"
                    name="codigo-barras"
                    type="text"
                    inputMode="numeric"
                    placeholder="Ex: 7894900011517"
                    value={codigo}
                    onChange={(event) => setCodigo(event.target.value)}
                    className="flex-1 rounded-2xl border border-[#ffd166] bg-white px-4 py-3 text-sm text-[#2f1b0c] outline-none transition focus:border-[#fcbf49] focus:ring-2 focus:ring-[#ffe066]"
                  />
                  <button
                    type="submit"
                    disabled={carregandoProduto}
                    className="inline-flex items-center justify-center rounded-2xl bg-[#d62828] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#b71d1d] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {carregandoProduto ? "Buscando..." : "Adicionar"}
                  </button>
                </div>
              </label>
              <p className="mt-3 text-xs text-[#8c5315]">
                Dica: pressione Enter após ler o código para incluir o item automaticamente.
              </p>
            </form>

            <div className="rounded-3xl border border-[#ffd166] bg-white/90 p-6 shadow-[0_20px_60px_-45px_rgba(214,40,40,0.5)]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-[#d62828]">
                  Itens da venda ({totalItens})
                </h2>
                {itens.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setItens([])}
                    className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d62828]/70 underline-offset-4 transition hover:text-[#d62828] hover:underline"
                  >
                    Limpar carrinho
                  </button>
                )}
              </div>

              <div className="mt-4 space-y-4">
                {itens.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#ffd166] bg-[#fff5d6] p-6 text-sm text-[#8c5315]">
                    Nenhum item adicionado. Busque um produto pelo código de barras para começar.
                  </div>
                ) : (
                  itens.map((item) => (
                    <article
                      key={item.id}
                      className="flex flex-col gap-4 rounded-2xl border border-[#ffd166] bg-white/80 p-4 shadow-sm transition hover:border-[#fcbf49]"
                    >
                      <header className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold text-[#d62828]">
                            {item.nome}
                          </h3>
                          <p className="text-xs uppercase tracking-[0.18em] text-[#8c5315]">
                            Código · {item.codigoBarras}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removerItem(item.id)}
                          className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d62828] transition hover:text-[#b71d1d]"
                        >
                          Remover
                        </button>
                      </header>

                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="inline-flex items-center rounded-full border border-[#ffd166] bg-white/90 pr-2">
                          <button
                            type="button"
                            onClick={() => atualizarQuantidade(item.id, -1)}
                            className="h-9 w-9 rounded-full text-lg font-semibold text-[#d62828]/70 transition hover:bg-[#ffe8cc] hover:text-[#d62828]"
                          >
                            −
                          </button>
                          <span className="w-12 text-center text-sm font-semibold text-[#d62828]">
                            {item.quantidade}
                          </span>
                          <button
                            type="button"
                            onClick={() => atualizarQuantidade(item.id, 1)}
                            className="h-9 w-9 rounded-full text-lg font-semibold text-[#d62828]/70 transition hover:bg-[#ffe8cc] hover:text-[#d62828]"
                          >
                            +
                          </button>
                        </div>
                        <div className="text-right text-sm text-[#8c5315]">
                          <p>Unitário: {formatCurrency(item.precoUnitario)}</p>
                          <p className="text-base font-semibold text-[#d62828]">
                            Subtotal: {formatCurrency(item.precoUnitario * item.quantidade)}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          </div>

          <aside className="flex flex-col gap-6 rounded-3xl border border-[#ffd166] bg-white/95 p-6 shadow-[0_25px_70px_-45px_rgba(214,40,40,0.55)]">
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-[#d62828]">
                Resumo da venda
              </h2>
              <dl className="space-y-3 text-sm text-[#8c5315]">
                <div className="flex items-center justify-between">
                  <dt>Total de itens</dt>
                  <dd className="font-semibold text-[#d62828]">{totalItens}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Valor parcial</dt>
                  <dd className="font-semibold text-[#d62828]">{formatCurrency(totalCalculado)}</dd>
                </div>
              </dl>
            </div>

            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#f4a226]">
                Forma de pagamento
              </h3>
              <div className="grid gap-2">
                {["Dinheiro", "Cartão", "Pix"].map((opcao) => {
                  const selecionado = opcao === formaPagamento;
                  return (
                    <button
                      key={opcao}
                      type="button"
                      onClick={() => setFormaPagamento(opcao)}
                      className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ffe066] ${
                        selecionado
                          ? "border-[#d62828] bg-[#d62828] text-white shadow-[0_12px_30px_-20px_rgba(214,40,40,0.6)]"
                          : "border-[#ffd166] bg-white text-[#8c5315] hover:border-[#fcbf49] hover:text-[#d62828]"
                      }`}
                    >
                      {opcao}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-[#ffd166] bg-[#fff5d6] p-5 text-sm text-[#8c5315]">
              Garanta que todos os itens estejam conferidos e que o pagamento escolhido esteja disponível no caixa.
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleFinalizarVenda}
                disabled={finalizandoVenda || itens.length === 0}
                className="inline-flex items-center justify-center rounded-2xl bg-[#fcbf49] px-5 py-4 text-sm font-semibold text-[#8c5315] transition hover:bg-[#f4a226] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {finalizandoVenda ? "Registrando venda..." : "Finalizar venda"}
              </button>
              <p className="text-xs text-[#8c5315]">
                O estoque será atualizado automaticamente após o registro bem-sucedido.
              </p>
            </div>

            {(erro || sucesso) && (
              <div
                role="status"
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  erro
                    ? "border-[#f4a1a1] bg-[#ffe5e5] text-[#b71d1d]"
                    : "border-[#c6f6d5] bg-[#f0fff4] text-[#23613d]"
                }`}
              >
                {erro ?? sucesso}
              </div>
            )}
          </aside>
        </section>
      </main>
    </div>
  );
}
