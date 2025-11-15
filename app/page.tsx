import Image from "next/image";
import Link from "next/link";

import prisma from "@/lib/prisma";

type StepKey = "hamburguer" | "periferico" | "bebida" | "sobremesa";

type CatalogProduct = {
  id: number;
  nome: string;
  codigoBarras: string;
  precoUnitario: number;
  qtdEstoque: number;
};

type ProdutoDbRecord = {
  id: number;
  nome: string;
  codigoBarras: string;
  precoUnitario: unknown;
  qtdEstoque: number;
};

type ClassifiedCatalog = {
  porCategoria: Record<StepKey, CatalogProduct[]>;
  extras: CatalogProduct[];
};

const STEP_SEQUENCE: StepKey[] = ["hamburguer", "periferico", "bebida", "sobremesa"];

const CATEGORY_DETAILS: Record<
  StepKey,
  { titulo: string; descricao: string; chamada: string; callToAction: string }
> = {
  hamburguer: {
    titulo: "Hambúrgueres",
    descricao: "Bases quentes para iniciar o combo perfeito.",
    chamada: "Seleção robusta para o rush.",
    callToAction: "Abrir PDV e adicionar",
  },
  periferico: {
    titulo: "Acompanhamentos",
    descricao: "Fritas, nuggets e outros periféricos crocantes.",
    chamada: "Complete o combo com crocância.",
    callToAction: "Escolher acompanhamento",
  },
  bebida: {
    titulo: "Bebidas",
    descricao: "Geladas, gaseificadas ou naturais para refrescar.",
    chamada: "Mantenha o caixa abastecido.",
    callToAction: "Selecionar bebida",
  },
  sobremesa: {
    titulo: "Sobremesas",
    descricao: "Doces que finalizam a experiência com chave de ouro.",
    chamada: "Finalize com um toque doce.",
    callToAction: "Adicionar sobremesa",
  },
};

const MATCHERS: Record<StepKey, RegExp[]> = {
  hamburguer: [/burger/i, /frango/i, /tera/i, /bacon/i, /debug/i, /combo/i],
  periferico: [/frita/i, /an[eé]is/i, /nugget/i, /acompanhamento/i],
  bebida: [/refrigerante/i, /suco/i, /[áa]gua/i, /bebida/i],
  sobremesa: [/sundae/i, /mouse/i, /cookie/i, /sobremesa/i, /milkshake/i],
};

const FIXED_BARCODES: Partial<Record<StepKey, readonly string[]>> = {
  hamburguer: [
    "1111111111111",
    "2222222222222",
    "3333333333333",
    "4444444444444",
    "5555555555555",
    "6666666666666",
  ],
  periferico: [
    "7777777777771",
    "7777777777772",
    "7777777777773",
    "8888888888888",
    "9999999999996",
    "9999999999990",
  ],
  bebida: ["1010101010101", "1010101010105", "2020202020202", "3030303030303"],
  sobremesa: ["4040404040404", "5050505050505", "6060606060606"],
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);

const normalizarTexto = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const toNumber = (valor: unknown): number => {
  if (typeof valor === "number" && Number.isFinite(valor)) {
    return valor;
  }

  if (typeof valor === "bigint") {
    return Number(valor);
  }

  if (typeof valor === "string") {
    const parsed = Number.parseFloat(valor.replace(/\s+/g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }

  if (valor && typeof valor === "object" && "toString" in valor) {
    const texto = (valor as { toString(): string }).toString();
    const parsed = Number.parseFloat(texto.replace(/\s+/g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }

  return Number.NaN;
};

const normalizarProduto = (produto: ProdutoDbRecord): CatalogProduct => {
  const preco = toNumber(produto.precoUnitario);
  return {
    id: produto.id,
    nome: produto.nome,
    codigoBarras: produto.codigoBarras,
    precoUnitario: Number.isFinite(preco) ? preco : 0,
    qtdEstoque: produto.qtdEstoque,
  };
};

const classificarProdutos = (produtos: CatalogProduct[]): ClassifiedCatalog => {
  const porCategoria: Record<StepKey, CatalogProduct[]> = {
    hamburguer: [],
    periferico: [],
    bebida: [],
    sobremesa: [],
  };

  const extras: CatalogProduct[] = [];

  produtos.forEach((produto) => {
    let associado = false;
    const nomeNormalizado = normalizarTexto(produto.nome);

    STEP_SEQUENCE.forEach((categoria) => {
      const codigos = FIXED_BARCODES[categoria];
      const correspondeCodigo = codigos ? codigos.includes(produto.codigoBarras) : false;
      const correspondeRegex = MATCHERS[categoria].some(
        (regex) => regex.test(produto.nome) || regex.test(nomeNormalizado)
      );

      if (correspondeCodigo || correspondeRegex) {
        porCategoria[categoria].push(produto);
        associado = true;
      }
    });

    if (!associado) {
      extras.push(produto);
    }
  });

  STEP_SEQUENCE.forEach((categoria) => {
    porCategoria[categoria].sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })
    );
  });

  extras.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));

  return { porCategoria, extras };
};

const obterDestaques = (produtos: CatalogProduct[], limite = 4) =>
  [...produtos]
    .sort((a, b) => {
      if (b.qtdEstoque !== a.qtdEstoque) {
        return b.qtdEstoque - a.qtdEstoque;
      }
      if (b.precoUnitario !== a.precoUnitario) {
        return b.precoUnitario - a.precoUnitario;
      }
      return a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" });
    })
    .slice(0, limite);

export default async function Home() {
  const produtosDb = await prisma.produto.findMany({
    orderBy: { nome: "asc" },
  });

  const produtosCatalogo = produtosDb.map(normalizarProduto);
  const produtosDisponiveis = produtosCatalogo.filter((produto) => produto.qtdEstoque > 0);
  const produtosBase = produtosDisponiveis.length ? produtosDisponiveis : produtosCatalogo;

  const totalItensCatalogo = produtosBase.length;
  const totalEstoque = produtosBase.reduce((acc, produto) => acc + produto.qtdEstoque, 0);

  const destaques = obterDestaques(produtosBase);
  const { porCategoria, extras } = classificarProdutos(produtosBase);

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans text-[#2f1b0c] antialiased">
      <main className="flex flex-1 flex-col">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-br from-[#680a0a] via-[#aa1111] to-[#d62828]" />
          <div className="absolute -left-24 top-32 h-72 w-72 rounded-full bg-[#fcbf49]/30 blur-3xl" />
          <div className="absolute -right-16 top-10 h-64 w-64 rounded-full bg-[#ffe066]/25 blur-3xl" />
          <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-14 px-6 pb-24 pt-10 sm:px-10 lg:px-16">
            <header className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-white">
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em]">
                  Sabor Express
                </span>
                <span className="text-sm font-medium text-white/80">
                  Estoque conectado ao PDV
                </span>
              </div>
              <nav aria-label="Principal" className="flex items-center gap-6 text-sm font-medium text-white/70">
                <Link href="/" className="transition hover:text-white">
                  Início
                </Link>
                <Link href="/venda" className="transition hover:text-white">
                  PDV
                </Link>
                <Link href="/estoque" className="transition hover:text-white">
                  Estoque
                </Link>
                <Link href="/venda/historico" className="transition hover:text-white">
                  Histórico
                </Link>
                <Link href="/api/venda" className="transition hover:text-white">
                  API
                </Link>
              </nav>
            </header>

            <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
              <div className="flex flex-col gap-6 text-white">
                <h1 className="text-4xl font-black leading-tight tracking-[-0.01em] sm:text-5xl lg:text-6xl">
                  Cardápio guiado pelo estoque,
                  <br /> pronto para acelerar o atendimento.
                </h1>
                <p className="text-lg text-[#ffe5a2] sm:text-xl">
                  {totalItensCatalogo > 0 ? (
                    <>
                      Hoje temos{" "}
                      <span className="font-semibold text-white">{totalItensCatalogo}</span> produtos ativos
                      somando{" "}
                      <span className="font-semibold text-white">{totalEstoque}</span> unidades disponíveis
                      para criar combos certeiros no PDV.
                    </>
                  ) : (
                    <>
                      Cadastre os produtos no estoque para montar o cardápio do PDV e apresentar
                      os itens mais rentáveis da operação.
                    </>
                  )}
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link
                    href="/venda"
                    className="inline-flex items-center justify-center rounded-full bg-[#fcbf49] px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#5f3200] shadow-[0_18px_40px_-20px_rgba(244,162,38,0.8)] transition hover:bg-[#f4a226]"
                  >
                    Abrir PDV conectado
                  </Link>
                  <Link
                    href="/estoque"
                    className="inline-flex items-center justify-center rounded-full border border-white/40 px-6 py-3 text-sm font-medium text-white transition hover:border-white hover:bg-white/10"
                  >
                    Gerenciar estoque
                  </Link>
                </div>
                <div className="flex flex-wrap gap-4 pt-4 text-sm text-[#ffe5a2]">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
                    • Atualiza em tempo real com as vendas
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
                    • Combina as categorias do menu progressivo
                  </span>
                </div>
              </div>
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-[#fcbf49]/20 blur-3xl" />
                <div className="relative flex h-80 w-full max-w-sm items-center justify-center rounded-[2.5rem] border border-white/20 bg-white/10 p-6 backdrop-blur">
                  <Image
                    src="/assets/hero-burger.svg"
                    alt="Visualização do cardápio integrado"
                    width={420}
                    height={320}
                    className="h-auto w-full drop-shadow-[0_24px_60px_rgba(0,0,0,0.35)]"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="mais-vendidos"
          className="relative mx-auto -mt-16 w-full max-w-6xl rounded-4xl border border-[#ffd166] bg-white px-6 pb-12 pt-16 shadow-[0_40px_80px_-50px_rgba(214,40,40,0.45)] sm:px-10 lg:px-16"
        >
          <header className="flex flex-col gap-4 text-center">
            <span className="mx-auto rounded-full bg-[#ffe8cc] px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-[#d62828]">
              destaques do estoque
            </span>
            <h2 className="text-3xl font-bold text-[#d62828] sm:text-4xl">
              Produtos em alta para montar combos rápidos
            </h2>
            <p className="mx-auto max-w-3xl text-base text-[#8c5315]">
              Selecionamos primeiro os itens com maior disponibilidade para garantir agilidade no atendimento.
              Ajuste o estoque sempre que necessário e mantenha o cardápio atualizado para o time de frente.
            </p>
          </header>

          {destaques.length > 0 ? (
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {destaques.map((item) => (
                <article
                  key={item.id}
                  className="group flex h-full flex-col rounded-3xl border border-[#fcbf49] bg-[#fffdf7] p-6 transition hover:-translate-y-1.5 hover:border-[#f4a226] hover:shadow-[0_20px_60px_-40px_rgba(214,40,40,0.5)]"
                >
                  <header className="flex items-start justify-between gap-4">
                    <div className="flex flex-col">
                      <h3 className="text-lg font-semibold text-[#d62828]">
                        {item.nome}
                      </h3>
                      <p className="text-xs uppercase tracking-[0.18em] text-[#8c5315]">
                        Código {item.codigoBarras}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#ffe066] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#7a4504]">
                      {item.qtdEstoque} u
                    </span>
                  </header>
                  <p className="mt-3 text-sm text-[#8c5315]">
                    Ideal para combos com margem saudável. Disponibilidade monitorada pelo estoque.
                  </p>
                  <div className="mt-auto flex items-end justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs uppercase tracking-[0.18em] text-[#8c5315]/70">
                        Preço unitário
                      </span>
                      <span className="text-2xl font-bold text-[#d62828]">
                        {formatCurrency(item.precoUnitario)}
                      </span>
                    </div>
                    <Link
                      href="/venda"
                      className="inline-flex items-center justify-center rounded-full border border-[#d62828] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#d62828] transition hover:bg-[#d62828] hover:text-white"
                    >
                      abrir no PDV
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-12 rounded-3xl border border-dashed border-[#ffd166] bg-[#fff5d6] p-8 text-center text-sm text-[#8c5315]">
              Nenhum produto com estoque disponível foi encontrado. Cadastre ou ajuste itens na área de estoque para alimentar o cardápio inicial.
            </div>
          )}
        </section>

        <section className="mx-auto mt-16 w-full max-w-6xl px-6 pb-16 sm:px-10 lg:px-16">
          <div className="grid gap-10 rounded-4xl border border-[#ffd166] bg-[#fff8e5] p-10 shadow-[0_35px_80px_-55px_rgba(214,40,40,0.4)]">
            <header className="flex flex-col gap-3 text-center">
              <span className="mx-auto rounded-full bg-[#ffe8cc] px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#d62828]">
                cardápio por categoria
              </span>
              <h2 className="text-3xl font-bold text-[#d62828] sm:text-4xl">
                O mesmo menu progressivo do PDV, abastecido direto do estoque
              </h2>
              <p className="mx-auto max-w-3xl text-base text-[#8c5315]">
                Navegue pelas categorias que o time de atendimento utiliza na tela de vendas.
                Se faltar algo, complemente pelo backoffice e o site atualiza automaticamente.
              </p>
            </header>

            <div className="grid gap-6 lg:grid-cols-2">
              {STEP_SEQUENCE.map((categoria) => {
                const info = CATEGORY_DETAILS[categoria];
                const itens = porCategoria[categoria];
                return (
                  <section
                    key={categoria}
                    className="flex h-full flex-col rounded-3xl border border-[#ffd166] bg-white p-6 shadow-[0_25px_70px_-45px_rgba(214,40,40,0.45)] transition hover:border-[#fcbf49]"
                  >
                    <header className="flex flex-col gap-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f4a226]">
                        {info.chamada}
                      </span>
                      <h3 className="text-xl font-semibold text-[#d62828]">{info.titulo}</h3>
                      <p className="text-sm text-[#8c5315]">{info.descricao}</p>
                    </header>

                    {itens.length > 0 ? (
                      <ul className="mt-5 space-y-3 text-sm text-[#7a4504]">
                        {itens.slice(0, 6).map((item) => (
                          <li
                            key={item.id}
                            className="flex items-center justify-between rounded-2xl border border-[#ffd166] bg-[#fff9eb] px-4 py-3 transition hover:border-[#fcbf49]"
                          >
                            <div className="flex flex-col">
                              <span className="font-semibold text-[#d62828]">{item.nome}</span>
                              <span className="text-[11px] uppercase tracking-[0.18em] text-[#8c5315]/80">
                                Código {item.codigoBarras}
                              </span>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-xs uppercase tracking-[0.18em] text-[#8c5315]/70">
                                {item.qtdEstoque} u
                              </span>
                              <span className="text-sm font-semibold text-[#d62828]">
                                {formatCurrency(item.precoUnitario)}
                              </span>
                            </div>
                          </li>
                        ))}
                        {itens.length > 6 && (
                          <li className="rounded-2xl border border-dashed border-[#ffd166] bg-[#fff5d6] px-4 py-3 text-xs uppercase tracking-[0.18em] text-[#8c5315]">
                            + {itens.length - 6} item(ns) disponível(is) nesta categoria.
                          </li>
                        )}
                      </ul>
                    ) : (
                      <div className="mt-5 rounded-2xl border border-dashed border-[#ffd166] bg-[#fff5d6] px-4 py-5 text-sm text-[#8c5315]">
                        Nenhum produto classificado aqui ainda. Cadastre itens com o padrão desta categoria ou ajuste os nomes/códigos no estoque.
                      </div>
                    )}

                    <div className="mt-auto flex items-center justify-between gap-4 pt-6">
                      <Link
                        href="/venda"
                        className="inline-flex items-center justify-center rounded-full bg-[#d62828] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-[#b71d1d]"
                      >
                        {info.callToAction}
                      </Link>
                      <Link
                        href="/estoque"
                        className="inline-flex items-center justify-center rounded-full border border-[#ffd166] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#d62828] transition hover:border-[#fcbf49]"
                      >
                        Ajustar estoque
                      </Link>
                    </div>
                  </section>
                );
              })}
            </div>

            {extras.length > 0 && (
              <section className="rounded-3xl border border-[#ffd166] bg-white p-6 shadow-[0_25px_70px_-45px_rgba(214,40,40,0.45)]">
                <header className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f4a226]">
                    outros itens cadastrados
                  </span>
                  <h3 className="text-xl font-semibold text-[#d62828]">
                    Produtos fora das categorias principais
                  </h3>
                  <p className="text-sm text-[#8c5315]">
                    Esses itens não se encaixam nos filtros do menu progressivo. Revise os nomes ou códigos de barras para categorizá-los automaticamente.
                  </p>
                </header>
                <ul className="mt-5 grid gap-3 text-sm text-[#7a4504] md:grid-cols-2">
                  {extras.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-col rounded-2xl border border-[#ffd166] bg-[#fff9eb] px-4 py-3"
                    >
                      <span className="font-semibold text-[#d62828]">{item.nome}</span>
                      <span className="text-[11px] uppercase tracking-[0.18em] text-[#8c5315]/80">
                        Código {item.codigoBarras}
                      </span>
                      <div className="mt-2 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-[#8c5315]/80">
                        <span>{item.qtdEstoque} u</span>
                        <span>{formatCurrency(item.precoUnitario)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

