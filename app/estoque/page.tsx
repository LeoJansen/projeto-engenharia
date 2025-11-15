'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

type ProdutoPayload = {
  id: number;
  nome: string;
  codigoBarras: string;
  precoUnitario: string;
  qtdEstoque: number;
};

type ErroApi = {
  message?: string;
};

type EstadoCarregamento = "idle" | "carregando" | "sucesso" | "erro";

type ProdutoFormulario = {
  nome: string;
  codigoBarras: string;
  precoUnitario: string;
  qtdEstoque: string;
};

const estadoInicialFormulario: ProdutoFormulario = {
  nome: "",
  codigoBarras: "",
  precoUnitario: "",
  qtdEstoque: "",
};

export default function EstoquePage() {
  const [produtos, setProdutos] = useState<ProdutoPayload[]>([]);
  const [formulario, setFormulario] = useState<ProdutoFormulario>(estadoInicialFormulario);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);
  const [carregamentoLista, setCarregamentoLista] = useState<EstadoCarregamento>("idle");
  const [carregamentoCadastro, setCarregamentoCadastro] = useState<EstadoCarregamento>("idle");
  const [quantidadesEdicao, setQuantidadesEdicao] = useState<Record<number, string>>({});
  const [atualizandoEstoque, setAtualizandoEstoque] = useState<Record<number, boolean>>({});

  const sincronizarQuantidades = (lista: ProdutoPayload[]) => {
    setQuantidadesEdicao(
      lista.reduce<Record<number, string>>((acumulador, produto) => {
        acumulador[produto.id] = produto.qtdEstoque.toString();
        return acumulador;
      }, {})
    );
  };

  const estoqueTotal = useMemo(
    () => produtos.reduce((acc, produto) => acc + produto.qtdEstoque, 0),
    [produtos],
  );

  useEffect(() => {
    const carregarProdutos = async () => {
      setCarregamentoLista("carregando");
      setMensagemErro(null);

      try {
        const resposta = await fetch("/api/produto");
        const dados = (await resposta.json().catch(() => null)) as ProdutoPayload[] | ErroApi | null;

        if (!resposta.ok || !dados) {
          throw new Error((dados as ErroApi | null)?.message ?? "Não foi possível carregar os produtos");
        }

        const listaProdutos = dados as ProdutoPayload[];
        sincronizarQuantidades(listaProdutos);
        setProdutos(listaProdutos);
        setCarregamentoLista("sucesso");
      } catch (error) {
        console.error("[estoque] Falha ao listar produtos", error);
        setMensagemErro(error instanceof Error ? error.message : "Falha ao carregar produtos");
        setCarregamentoLista("erro");
      }
    };

    carregarProdutos();
  }, []);

  const atualizarCampo = (campo: keyof ProdutoFormulario, valor: string) => {
    setFormulario((prev) => ({ ...prev, [campo]: valor }));
  };

  const handleAtualizarEstoque = async (produto: ProdutoPayload) => {
    const valorDigitado = (quantidadesEdicao[produto.id] ?? "").trim();

    if (valorDigitado === "") {
      setMensagemErro("Informe a quantidade para atualizar o estoque");
      return;
    }

    if (!/^[0-9]+$/.test(valorDigitado)) {
      setMensagemErro("A quantidade deve conter apenas números inteiros");
      return;
    }

    const quantidade = Number(valorDigitado);

    if (!Number.isInteger(quantidade) || quantidade < 0) {
      setMensagemErro("A quantidade deve ser um número inteiro igual ou maior que zero");
      return;
    }

    setMensagemErro(null);
    setMensagemSucesso(null);
    setAtualizandoEstoque((prev) => ({ ...prev, [produto.id]: true }));

    try {
      const resposta = await fetch("/api/produto", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: produto.id, qtdEstoque: quantidade }),
      });

      const dados = (await resposta.json().catch(() => null)) as ProdutoPayload | ErroApi | null;

      if (!resposta.ok || !dados) {
        throw new Error((dados as ErroApi | null)?.message ?? "Não foi possível atualizar o estoque");
      }

      const produtoAtualizado = dados as ProdutoPayload;

      setProdutos((prev) =>
        prev.map((item) =>
          item.id === produtoAtualizado.id
            ? { ...item, qtdEstoque: produtoAtualizado.qtdEstoque }
            : item
        )
      );

      setQuantidadesEdicao((prev) => ({
        ...prev,
        [produtoAtualizado.id]: produtoAtualizado.qtdEstoque.toString(),
      }));

      setMensagemSucesso(`Estoque de ${produtoAtualizado.nome} atualizado!`);
    } catch (error) {
      console.error("[estoque] Falha ao atualizar estoque", error);
      setMensagemErro(error instanceof Error ? error.message : "Falha ao atualizar estoque");
    } finally {
      setAtualizandoEstoque((prev) => {
        const copia = { ...prev };
        delete copia[produto.id];
        return copia;
      });
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setMensagemErro(null);
    setMensagemSucesso(null);
    setCarregamentoCadastro("carregando");

    const payload = {
      ...formulario,
      precoUnitario: formulario.precoUnitario.replace(/,/g, "."),
      qtdEstoque: Number(formulario.qtdEstoque),
    };

    try {
      const resposta = await fetch("/api/produto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const dados = (await resposta.json().catch(() => null)) as ProdutoPayload | ErroApi | null;

      if (!resposta.ok || !dados) {
        throw new Error((dados as ErroApi | null)?.message ?? "Não foi possível cadastrar o produto");
      }

      const novoProduto = dados as ProdutoPayload;
      setProdutos((prev) => {
        const listaAtualizada = [...prev, novoProduto].sort((a, b) =>
          a.nome.localeCompare(b.nome)
        );
        sincronizarQuantidades(listaAtualizada);
        return listaAtualizada;
      });

      setFormulario(estadoInicialFormulario);
      setMensagemSucesso("Produto cadastrado com sucesso!");
      setCarregamentoCadastro("sucesso");
    } catch (error) {
      console.error("[estoque] Falha ao cadastrar produto", error);
      setMensagemErro(error instanceof Error ? error.message : "Falha ao cadastrar produto");
      setCarregamentoCadastro("erro");
    }
  };

  return (
    <div className="flex min-h-screen bg-linear-to-br from-white via-white to-[#fff9eb] font-sans text-[#2f1b0c] antialiased">
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
              Backoffice · Estoque
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-[#d62828] sm:text-5xl">
              Cadastre produtos e acompanhe o saldo disponível
            </h1>
            <p className="max-w-3xl text-base text-[#8c5315]">
              Mantenha o estoque sempre em dia: registre novos itens, atualize os códigos e verifique rapidamente os saldos antes de abrir o caixa.
            </p>
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-6 rounded-3xl border border-[#ffd166] bg-white/95 p-6 shadow-[0_20px_60px_-40px_rgba(214,40,40,0.45)]">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[#d62828]">Produtos cadastrados</h2>
                <p className="text-xs uppercase tracking-[0.18em] text-[#8c5315]/80">
                  Total geral: {estoqueTotal} unidades
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  setCarregamentoLista("carregando");
                  setMensagemErro(null);

                  try {
                    const resposta = await fetch("/api/produto");
                    const dados = (await resposta.json().catch(() => null)) as ProdutoPayload[] | ErroApi | null;

                    if (!resposta.ok || !dados) {
                      throw new Error((dados as ErroApi | null)?.message ?? "Não foi possível recarregar os produtos");
                    }

                    const listaProdutos = dados as ProdutoPayload[];
                    sincronizarQuantidades(listaProdutos);
                    setProdutos(listaProdutos);
                    setCarregamentoLista("sucesso");
                  } catch (error) {
                    console.error("[estoque] Falha ao recarregar produtos", error);
                    setMensagemErro(error instanceof Error ? error.message : "Falha ao recarregar produtos");
                    setCarregamentoLista("erro");
                  }
                }}
                className="rounded-full border border-[#ffd166] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#d62828] transition hover:border-[#fcbf49] hover:text-[#d62828]"
              >
                Atualizar lista
              </button>
            </header>

            {mensagemErro && (
              <div className="rounded-2xl border border-[#f4a1a1] bg-[#ffe5e5] px-4 py-3 text-sm text-[#b71d1d]">
                {mensagemErro}
              </div>
            )}

            <div className="max-h-[520px] overflow-hidden rounded-3xl border border-[#ffd166]">
              <div className="grid grid-cols-[1.3fr_1fr_0.8fr_0.75fr_0.85fr] gap-x-4 border-b border-[#ffd166] bg-[#fff5d6] px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#d62828]">
                <span>Produto</span>
                <span>Código de barras</span>
                <span className="text-right">Preço unitário</span>
                <span className="text-right">Estoque</span>
                <span className="text-right">Ação</span>
              </div>
              <div className="max-h-[460px] overflow-y-auto">
                {carregamentoLista === "carregando" ? (
                  <div className="flex h-40 items-center justify-center text-sm text-[#8c5315]">
                    Carregando produtos...
                  </div>
                ) : produtos.length === 0 ? (
                  <div className="flex h-40 items-center justify-center px-5 text-sm text-[#8c5315]">
                    Nenhum produto cadastrado até o momento.
                  </div>
                ) : (
                  <ul className="divide-y divide-[#ffe066]/60">
                    {produtos.map((produto) => {
                      const valorEdicao = quantidadesEdicao[produto.id] ?? produto.qtdEstoque.toString();
                      const estaAtualizando = Boolean(atualizandoEstoque[produto.id]);
                      const botaoDesabilitado = estaAtualizando || valorEdicao.trim() === "";

                      return (
                        <li
                          key={produto.id}
                          className="grid grid-cols-[1.3fr_1fr_0.8fr_0.75fr_0.85fr] items-center gap-x-4 px-5 py-4 text-sm text-[#7a4504] hover:bg-[#fff8e5]"
                        >
                          <span className="font-medium text-[#d62828]">{produto.nome}</span>
                          <span className="text-xs uppercase tracking-[0.14em] text-[#8c5315]">{produto.codigoBarras}</span>
                          <span className="text-right font-medium text-[#d62828]">{formatoMoeda.format(Number(produto.precoUnitario))}</span>
                          <input
                            id={`estoque-${produto.id}`}
                            inputMode="numeric"
                            value={valorEdicao}
                            onChange={(event) => {
                              const somenteNumeros = event.target.value.replace(/[^0-9]/g, "");
                              setQuantidadesEdicao((prev) => ({
                                ...prev,
                                [produto.id]: somenteNumeros,
                              }));
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                handleAtualizarEstoque(produto);
                              }
                            }}
                            className="w-24 justify-self-end rounded-xl border border-[#ffd166] bg-white px-3 py-2 text-right text-sm font-semibold text-[#d62828] outline-none transition focus:border-[#fcbf49] focus:ring-2 focus:ring-[#ffe066]"
                            aria-label={`Estoque de ${produto.nome}`}
                          />
                          <button
                            type="button"
                            onClick={() => handleAtualizarEstoque(produto)}
                            disabled={botaoDesabilitado}
                            className="justify-self-end rounded-xl border border-[#ffd166] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#d62828] transition hover:border-[#fcbf49] hover:bg-[#fff5d6] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {estaAtualizando ? "Salvando..." : "Salvar"}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <aside className="flex flex-col gap-6 rounded-3xl border border-[#ffd166] bg-white p-6 shadow-[0_25px_70px_-45px_rgba(214,40,40,0.5)]">
            <div className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold text-[#d62828]">Cadastrar novo produto</h2>
              <p className="text-sm text-[#8c5315]">
                Preencha todos os campos para que o PDV utilize os valores corretos em tempo real.
              </p>
            </div>

            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-[#d62828]">Nome do produto</span>
                <input
                  required
                  type="text"
                  value={formulario.nome}
                  onChange={(event) => atualizarCampo("nome", event.target.value)}
                  placeholder="Ex: Refrigerante lata"
                  className="rounded-2xl border border-[#ffd166] bg-white px-4 py-3 text-sm text-[#2f1b0c] outline-none transition focus:border-[#fcbf49] focus:ring-2 focus:ring-[#ffe066]"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-[#d62828]">Código de barras</span>
                <input
                  required
                  type="text"
                  value={formulario.codigoBarras}
                  onChange={(event) => atualizarCampo("codigoBarras", event.target.value)}
                  placeholder="Ex: 7894900011517"
                  className="rounded-2xl border border-[#ffd166] bg-white px-4 py-3 text-sm text-[#2f1b0c] outline-none transition focus:border-[#fcbf49] focus:ring-2 focus:ring-[#ffe066]"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-[#d62828]">Preço unitário (R$)</span>
                <input
                  required
                  inputMode="decimal"
                  value={formulario.precoUnitario}
                  onChange={(event) => atualizarCampo("precoUnitario", event.target.value)}
                  placeholder="Ex: 5,90"
                  className="rounded-2xl border border-[#ffd166] bg-white px-4 py-3 text-sm text-[#2f1b0c] outline-none transition focus:border-[#fcbf49] focus:ring-2 focus:ring-[#ffe066]"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-[#d62828]">Quantidade em estoque</span>
                <input
                  required
                  inputMode="numeric"
                  value={formulario.qtdEstoque}
                  onChange={(event) => atualizarCampo("qtdEstoque", event.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="Ex: 24"
                  className="rounded-2xl border border-[#ffd166] bg-white px-4 py-3 text-sm text-[#2f1b0c] outline-none transition focus:border-[#fcbf49] focus:ring-2 focus:ring-[#ffe066]"
                />
              </label>

              <button
                type="submit"
                disabled={carregamentoCadastro === "carregando"}
                className="inline-flex items-center justify-center rounded-2xl bg-[#d62828] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#b71d1d] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {carregamentoCadastro === "carregando" ? "Cadastrando..." : "Cadastrar produto"}
              </button>
            </form>

            {(mensagemSucesso || mensagemErro) && (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  mensagemErro
                    ? "border-[#f4a1a1] bg-[#ffe5e5] text-[#b71d1d]"
                    : "border-[#c6f6d5] bg-[#f0fff4] text-[#23613d]"
                }`}
              >
                {mensagemErro ?? mensagemSucesso}
              </div>
            )}

            <div className="rounded-2xl border border-dashed border-[#ffd166] bg-[#fff5d6] p-5 text-sm text-[#8c5315]">
              Ao finalizar as vendas, o estoque é baixado automaticamente. Utilize esta tela para reforços rápidos ou ajustes antes do rush.
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
