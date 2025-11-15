'use client';

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";

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

type StepKey = "hamburguer" | "periferico" | "bebida" | "sobremesa";

type StepConfig = {
  titulo: string;
  descricao: string;
  labelBotaoVazio: string;
  artigo: "um" | "uma";
};

type VendaStep = "pedido" | "carrinho" | "pagamento";

const VENDA_STEPS: VendaStep[] = ["pedido", "carrinho", "pagamento"];

const VENDA_STEP_CONFIG: Record<VendaStep, { titulo: string; descricao: string }> = {
  pedido: {
    titulo: "Monte o pedido",
    descricao: "Inclua produtos via código de barras ou menu progressivo.",
  },
  carrinho: {
    titulo: "Revise o carrinho",
    descricao: "Ajuste quantidades, remova itens ou volte para adicionar mais.",
  },
  pagamento: {
    titulo: "Finalize o pagamento",
    descricao: "Selecione a forma de pagamento e conclua o registro da venda.",
  },
};

const STEP_SEQUENCE: StepKey[] = [
  "hamburguer",
  "periferico",
  "bebida",
  "sobremesa",
];

const STEP_CONFIG: Record<StepKey, StepConfig> = {
  hamburguer: {
    titulo: "Hambúrguer",
    descricao: "Escolha a base do combo entre nossas opções mais pedidas.",
    labelBotaoVazio: "Nenhum hambúrguer cadastrado",
    artigo: "um",
  },
  periferico: {
    titulo: "Periférico",
    descricao: "Selecione um acompanhamento para deixar o combo completo.",
    labelBotaoVazio: "Nenhum periférico cadastrado",
    artigo: "um",
  },
  bebida: {
    titulo: "Bebida",
    descricao: "Garanta uma bebida gelada para acompanhar o lanche.",
    labelBotaoVazio: "Nenhuma bebida cadastrada",
    artigo: "uma",
  },
  sobremesa: {
    titulo: "Sobremesa",
    descricao: "Finalize com um toque doce — opcional, mas muito recomendado!",
    labelBotaoVazio: "Nenhuma sobremesa cadastrada",
    artigo: "uma",
  },
};

const MATCHERS: Record<StepKey, RegExp[]> = {
  hamburguer: [/burger/i, /frango/i, /tera/i, /bacon/i, /debug/i],
  periferico: [/frita/i, /an[eé]is/i, /nugget/i],
  bebida: [/refrigerante/i, /suco/i, /[áa]gua/i],
  sobremesa: [/sundae/i, /mouse/i, /cookie/i, /sobremesa/i],
};

const CODIGOS_FIXOS: Partial<Record<StepKey, string[]>> = {
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
  bebida: [
    "1010101010101",
    "1010101010105",
    "2020202020202",
    "3030303030303",
  ],
  sobremesa: [
    "4040404040404",
    "5050505050505",
    "6060606060606",
  ],
};

const criarSelecoesVazias = (): Record<StepKey, ProdutoResponse | null> =>
  STEP_SEQUENCE.reduce((acc, step) => {
    acc[step] = null;
    return acc;
  }, {} as Record<StepKey, ProdutoResponse | null>);

const parsePrecoUnitario = (preco: number | string): number => {
  if (typeof preco === "number" && Number.isFinite(preco)) {
    return preco;
  }

  if (typeof preco === "string") {
    const normalizado = preco.replace(/\s+/g, "").replace(/,/g, ".");
    const valor = Number(normalizado);

    if (Number.isFinite(valor)) {
      return valor;
    }
  }

  throw new Error("Preço do produto inválido");
};

const obterPrecoProduto = (produto: ProdutoResponse): number =>
  parsePrecoUnitario(produto.precoUnitario);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);

const obterImagemProduto = (nomeProduto: string, codigoBarras: string): string => {
  const mapeamento: Record<string, string> = {
    "1111111111111": "/assets/Kernel Burger.990Z.png",
    "2222222222222": "/assets/dual-core-burguer.334Z.png",
    "3333333333333": "/assets/BaconByte .244Z.png",
    "4444444444444": "/assets/firewall.593Z.png",
    "5555555555555": "/assets/debug.436Z.png",
    "6666666666666": "/assets/teraburguer.959Z.png",
    "7777777777771": "/assets/megafritas.218Z.png",
    "7777777777772": "/assets/megafritas.218Z.png",
    "7777777777773": "/assets/megafritas.218Z.png",
    "8888888888888": "/assets/aneis-de-rede.032Z.png",
    "9999999999996": "/assets/nuggets-zip.685Z.png",
    "9999999999990": "/assets/nuggets-zip.685Z.png",
    "1010101010101": "/assets/refrigerante.421Z.png",
    "1010101010105": "/assets/refrigerante.421Z.png",
    "2020202020202": "/assets/suco.396Z.png",
    "3030303030303": "/assets/agua.809Z.png",
    "4040404040404": "/assets/sundae.348Z.png",
    "5050505050505": "/assets/mousse.530Z.png",
    "6060606060606": "/assets/cookie.360Z.png",
  };

  return mapeamento[codigoBarras] || "/assets/burger.svg";
};

export default function VendaPage() {
  const [codigo, setCodigo] = useState("");
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [formaPagamento, setFormaPagamento] = useState("Dinheiro");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [carregandoProduto, setCarregandoProduto] = useState(false);
  const [finalizandoVenda, setFinalizandoVenda] = useState(false);
  const [catalogo, setCatalogo] = useState<ProdutoResponse[]>([]);
  const [carregandoCatalogo, setCarregandoCatalogo] = useState(true);
  const [erroCatalogo, setErroCatalogo] = useState<string | null>(null);
  const [selecoes, setSelecoes] = useState<Record<StepKey, ProdutoResponse | null>>(
    criarSelecoesVazias
  );
  const [etapaAtual, setEtapaAtual] = useState<VendaStep>("pedido");
  const router = useRouter();
  const pathname = usePathname();
  const { operador, setOperador } = useAuth();
  const [deslogando, setDeslogando] = useState(false);

  const redirecionarParaLogin = useCallback(() => {
    const destino = encodeURIComponent(pathname ?? "/venda");
    router.replace(`/login?redirect=${destino}`);
  }, [pathname, router]);

  const handleLogout = useCallback(async () => {
    setDeslogando(true);

    try {
      const resposta = await fetch("/api/auth/logout", { method: "POST" });

      if (!resposta.ok) {
        throw new Error("Falha ao encerrar sessão");
      }
    } catch (error) {
      console.error("[pdv] Falha ao encerrar sessão", error);
    } finally {
      setOperador(null);
      setDeslogando(false);
      redirecionarParaLogin();
      router.refresh();
    }
  }, [redirecionarParaLogin, router, setOperador]);

  const indiceEtapaAtual = useMemo(
    () => VENDA_STEPS.indexOf(etapaAtual),
    [etapaAtual]
  );

  const podeAvancarEtapaAtual = useMemo(() => {
    if (etapaAtual === "pedido") {
      return itens.length > 0;
    }

    if (etapaAtual === "carrinho") {
      return itens.length > 0;
    }

    return false;
  }, [etapaAtual, itens.length]);

  const handleAvancarEtapa = () => {
    if (!podeAvancarEtapaAtual) {
      if (etapaAtual === "pedido") {
        setErro("Adicione pelo menos um item ao carrinho para continuar");
      } else if (etapaAtual === "carrinho") {
        setErro("Verifique o carrinho antes de prosseguir");
      }
      return;
    }

    setErro(null);
    setSucesso(null);

    if (indiceEtapaAtual < VENDA_STEPS.length - 1) {
      setEtapaAtual(VENDA_STEPS[indiceEtapaAtual + 1]);
    }
  };

  const handleVoltarEtapa = () => {
    if (indiceEtapaAtual > 0) {
      setErro(null);
      setSucesso(null);
      setEtapaAtual(VENDA_STEPS[indiceEtapaAtual - 1]);
    }
  };

  useEffect(() => {
    if (etapaAtual !== "pedido" && itens.length === 0) {
      setEtapaAtual("pedido");
    }
  }, [etapaAtual, itens.length]);

  const carregarCatalogo = useCallback(async () => {
    setCarregandoCatalogo(true);
    setErroCatalogo(null);

    try {
      const resposta = await fetch("/api/produto");
      const dados = (await resposta.json().catch(() => null)) as unknown;

      if (resposta.status === 401) {
        redirecionarParaLogin();
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      if (!resposta.ok) {
        const mensagemErro =
          dados &&
          typeof dados === "object" &&
          dados !== null &&
          "message" in dados &&
          typeof (dados as ApiError).message === "string"
            ? (dados as ApiError).message
            : "Não foi possível carregar o catálogo de produtos";

        throw new Error(mensagemErro);
      }

      if (!Array.isArray(dados)) {
        throw new Error("Resposta inválida do servidor ao carregar produtos");
      }

      const produtos = dados as ProdutoResponse[];

      setCatalogo(produtos);
      setSelecoes((prev) => {
        const idsDisponiveis = new Set(produtos.map((produto) => produto.id));
        const atualizadas = criarSelecoesVazias();

        STEP_SEQUENCE.forEach((step) => {
          const selecionadoAnterior = prev[step];

          if (selecionadoAnterior && idsDisponiveis.has(selecionadoAnterior.id)) {
            atualizadas[step] = selecionadoAnterior;
          }
        });

        return atualizadas;
      });
    } catch (error) {
      console.error("[pdv] Falha ao carregar catálogo", error);
      setErroCatalogo(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o catálogo de produtos"
      );
    } finally {
      setCarregandoCatalogo(false);
    }
  }, [redirecionarParaLogin]);

  useEffect(() => {
    void carregarCatalogo();
  }, [carregarCatalogo]);

  const catalogoPorCategoria = useMemo(() => {
    const normalizarTexto = (texto: string) =>
      texto
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

    return STEP_SEQUENCE.reduce((acc, etapa) => {
      const codigos = new Set(CODIGOS_FIXOS[etapa] ?? []);

      acc[etapa] = catalogo
        .filter((produto) => {
          const nomeNormalizado = normalizarTexto(produto.nome);
          const correspondeCodigo = codigos.has(produto.codigoBarras);
          const correspondeRegex = MATCHERS[etapa].some(
            (regex) => regex.test(produto.nome) || regex.test(nomeNormalizado)
          );

          if (codigos.size > 0) {
            return correspondeCodigo || correspondeRegex;
          }

          return correspondeRegex;
        })
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));

      return acc;
    }, {} as Record<StepKey, ProdutoResponse[]>);
  }, [catalogo]);

  const selecoesEmOrdem = useMemo(
    () =>
      STEP_SEQUENCE.map((step) => selecoes[step]).filter(
        (produto): produto is ProdutoResponse => Boolean(produto)
      ),
    [selecoes]
  );

  const comboCompleto = useMemo(
    () =>
      STEP_SEQUENCE.every((step) => {
        const possuiOpcoes = (catalogoPorCategoria[step]?.length ?? 0) > 0;

        if (!possuiOpcoes) {
          return true;
        }

        return Boolean(selecoes[step]);
      }),
    [catalogoPorCategoria, selecoes]
  );

  const podeAdicionarCombo =
    comboCompleto && selecoesEmOrdem.length > 0 && !carregandoCatalogo && !erroCatalogo;

  const handleSelecionarProduto = (etapa: StepKey, produto: ProdutoResponse) => {
    setSelecoes((prev) => {
      const proximo = { ...prev, [etapa]: produto };
      const indiceEtapa = STEP_SEQUENCE.indexOf(etapa);

      for (let indice = indiceEtapa + 1; indice < STEP_SEQUENCE.length; indice += 1) {
        proximo[STEP_SEQUENCE[indice]] = null;
      }

      return proximo;
    });

    setErro((mensagemAtual) =>
      mensagemAtual && mensagemAtual.startsWith("Selecione") ? null : mensagemAtual
    );
  };

  const handleResetSelecoes = () => {
    setSelecoes(criarSelecoesVazias());
    setErro((mensagemAtual) =>
      mensagemAtual && mensagemAtual.startsWith("Selecione") ? null : mensagemAtual
    );
  };

  const handleAdicionarCombo = () => {
    setErro(null);
    setSucesso(null);

    const etapaPendente = STEP_SEQUENCE.find(
      (step) => (catalogoPorCategoria[step]?.length ?? 0) > 0 && !selecoes[step]
    );

    if (etapaPendente) {
      const config = STEP_CONFIG[etapaPendente];
      setErro(
        `Selecione ${config.artigo} ${config.titulo.toLowerCase()} antes de prosseguir`
      );
      return;
    }

    if (selecoesEmOrdem.length === 0) {
      setErro("Nenhum item selecionado");
      return;
    }

    try {
      selecoesEmOrdem.forEach((produto) => {
        const item = normalizarProduto(produto);
        adicionarOuIncrementarItem(item);
      });

      setSucesso("Itens do combo adicionados ao carrinho!");
      setSelecoes(criarSelecoesVazias());
    } catch (error) {
      console.error("[pdv] Falha ao adicionar combo", error);
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível adicionar o combo ao carrinho"
      );
    }
  };

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
    const precoNumero = obterPrecoProduto(produto);

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

      if (resposta.status === 401) {
        redirecionarParaLogin();
        throw new Error("Sessão expirada. Faça login novamente.");
      }

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
    };

    try {
      const resposta = await fetch("/api/venda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (resposta.status === 401) {
        redirecionarParaLogin();
        throw new Error("Sessão expirada. Faça login novamente.");
      }

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
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href="/venda/historico"
                className="inline-flex items-center justify-center rounded-full border border-[#ffd166] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#d62828] transition hover:border-[#fcbf49] hover:text-[#d62828]"
              >
                Consultar histórico de vendas
              </Link>
              {operador && (
                <span className="inline-flex items-center gap-2 rounded-full border border-[#ffd166] bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#d62828]">
                  Operador · <span className="text-[#8c5315]">{operador.nome}</span>
                </span>
              )}
              <button
                type="button"
                onClick={handleLogout}
                disabled={deslogando}
                className="inline-flex items-center justify-center rounded-full border border-[#ffd166] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#d62828] transition hover:border-[#fcbf49] hover:text-[#d62828] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deslogando ? "Saindo..." : "Encerrar sessão"}
              </button>
            </div>
          </div>
        </header>

        <section className="flex flex-col gap-8">
          <div className="rounded-3xl border border-[#ffd166] bg-white/80 p-6 shadow-[0_20px_60px_-45px_rgba(214,40,40,0.35)] backdrop-blur-sm">
            <div className="flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-3">
                {VENDA_STEPS.map((step, index) => {
                  const config = VENDA_STEP_CONFIG[step];
                  const ativo = step === etapaAtual;
                  const concluido = VENDA_STEPS.indexOf(step) < indiceEtapaAtual;
                  return (
                    <div
                      key={step}
                      className={`rounded-2xl border px-4 py-3 transition focus-within:ring-2 focus-within:ring-[#ffe066] ${
                        ativo
                          ? "border-[#d62828] bg-[#ffe5e5] text-[#d62828] shadow-[0_15px_35px_-30px_rgba(214,40,40,0.8)]"
                          : concluido
                          ? "border-[#c6f6d5] bg-[#f0fff4] text-[#23613d]"
                          : "border-[#ffd166] bg-white/90 text-[#8c5315]"
                      }`}
                    >
                      <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                        Passo {index + 1}
                      </span>
                      <p className="text-sm font-semibold">{config.titulo}</p>
                      <p className="text-[11px] text-[#8c5315]/80">{config.descricao}</p>
                    </div>
                  );
                })}
              </div>
              <progress
                className="h-2 w-full overflow-hidden rounded-full bg-[#ffd166]/50 [&::-webkit-progress-bar]:bg-transparent [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-[#d62828] [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-[#d62828]"
                max={VENDA_STEPS.length}
                value={indiceEtapaAtual + 1}
              />
            </div>
          </div>

          {etapaAtual === "pedido" && (
            <section className="rounded-3xl border border-[#ffd166] bg-white/95 p-6 shadow-[0_20px_60px_-45px_rgba(214,40,40,0.5)] flex flex-col gap-6">
              <header className="flex flex-col gap-2">
                <h2 className="text-2xl font-semibold text-[#d62828]">
                  {VENDA_STEP_CONFIG.pedido.titulo}
                </h2>
                <p className="text-sm text-[#8c5315]">
                  {VENDA_STEP_CONFIG.pedido.descricao}
                </p>
              </header>

              <div className="flex flex-col gap-6">
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
                  <div className="flex flex-col gap-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f4a226]">
                      Menu progressivo
                    </span>
                    <h2 className="text-xl font-semibold text-[#d62828] sm:text-2xl">
                      Monte o combo em quatro etapas
                    </h2>
                    <p className="text-sm text-[#8c5315]">
                      Avance na ordem sugerida para acelerar o atendimento. Cada seleção pode ser ajustada a qualquer momento antes de enviar ao carrinho.
                    </p>
                  </div>

                  {erroCatalogo && (
                    <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-[#f4a1a1] bg-[#ffe5e5] p-4 text-xs text-[#b71d1d]">
                      <span>{erroCatalogo}</span>
                      <button
                        type="button"
                        onClick={carregarCatalogo}
                        disabled={carregandoCatalogo}
                        className="inline-flex w-fit items-center gap-2 rounded-full bg-[#d62828] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-[#b71d1d] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Tentar novamente
                      </button>
                    </div>
                  )}

                  <div className="mt-6 flex flex-col gap-5">
                    {STEP_SEQUENCE.map((step, index) => {
                      const config = STEP_CONFIG[step];
                      const opcoes = catalogoPorCategoria[step] ?? [];
                      const selecionado = selecoes[step];
                      const etapaAnterior = index > 0 ? STEP_SEQUENCE[index - 1] : null;
                      const etapaAnteriorPossuiOpcoes =
                        etapaAnterior !== null
                          ? (catalogoPorCategoria[etapaAnterior]?.length ?? 0) > 0
                          : false;
                      const etapaAnteriorCompleta =
                        index === 0 ||
                        !etapaAnteriorPossuiOpcoes ||
                        (etapaAnterior !== null && Boolean(selecoes[etapaAnterior]));
                      const etapaInativa =
                        !etapaAnteriorCompleta || carregandoCatalogo || Boolean(erroCatalogo);

                      return (
                        <section
                          key={step}
                          className={`rounded-2xl border border-[#ffd166] bg-white/80 p-4 shadow-sm transition ${
                            etapaInativa ? "opacity-60" : "hover:border-[#fcbf49]"
                          }`}
                        >
                          <header className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex flex-col gap-1">
                              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f4a226]">
                                Passo {index + 1}
                              </span>
                              <h3 className="text-base font-semibold text-[#d62828]">
                                {config.titulo}
                              </h3>
                            </div>
                            {selecionado && (
                              <span className="rounded-full bg-[#d62828]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d62828]">
                                Selecionado
                              </span>
                            )}
                          </header>
                          <p className="mt-2 text-xs text-[#8c5315]">{config.descricao}</p>

                          <div className="mt-4 flex flex-col gap-2">
                            {carregandoCatalogo ? (
                              <div className="grid gap-2">
                                {[0, 1, 2].map((skeleton) => (
                                  <div
                                    key={skeleton}
                                    className="h-10 rounded-xl bg-[#ffe8cc] opacity-70 animate-pulse"
                                  />
                                ))}
                              </div>
                            ) : opcoes.length === 0 ? (
                              <p className="rounded-xl border border-dashed border-[#ffd166] px-3 py-3 text-xs text-[#b5863a]">
                                {config.labelBotaoVazio}
                              </p>
                            ) : (
                              opcoes.map((produto) => {
                                const selecionadoAtual = selecionado?.id === produto.id;
                                const ativo = !etapaInativa;
                                const preco = obterPrecoProduto(produto);

                                return (
                                  <button
                                    key={produto.id}
                                    type="button"
                                    onClick={() => handleSelecionarProduto(step, produto)}
                                    disabled={!ativo}
                                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ffe066] ${
                                      selecionadoAtual
                                        ? "border-[#d62828] bg-[#d62828] text-white shadow-[0_12px_30px_-20px_rgba(214,40,40,0.6)]"
                                        : "border-[#ffd166] bg-white text-[#8c5315] hover:border-[#fcbf49] hover:text-[#d62828]"
                                    } ${!ativo ? "cursor-not-allowed opacity-60" : ""}`}
                                  >
                                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white/50">
                                      <Image
                                        src={obterImagemProduto(produto.nome, produto.codigoBarras)}
                                        alt={produto.nome}
                                        fill
                                        className="object-cover"
                                        sizes="48px"
                                      />
                                    </div>
                                    <span className="flex-1 text-left font-semibold">{produto.nome}</span>
                                    <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                                      {formatCurrency(preco)}
                                    </span>
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </section>
                      );
                    })}
                  </div>

                  <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-[#fff5d6] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#d62828]">
                        Resumo das escolhas
                      </h3>
                      {comboCompleto ? (
                        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#23613d]">
                          Pronto para adicionar
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8c5315]">
                          Complete as etapas
                        </span>
                      )}
                    </div>

                    {selecoesEmOrdem.length > 0 ? (
                      <ul className="space-y-2 text-sm text-[#8c5315]">
                        {selecoesEmOrdem.map((produto) => {
                          const preco = obterPrecoProduto(produto);
                          return (
                            <li key={produto.id} className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white shadow-sm">
                                  <Image
                                    src={obterImagemProduto(produto.nome, produto.codigoBarras)}
                                    alt={produto.nome}
                                    fill
                                    className="object-cover"
                                    sizes="40px"
                                  />
                                </div>
                                <span>{produto.nome}</span>
                              </div>
                              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d62828]">
                                {formatCurrency(preco)}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-xs text-[#8c5315]">
                        Nenhum item selecionado ainda. Inicie escolhendo o hambúrguer desejado.
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={handleAdicionarCombo}
                        disabled={!podeAdicionarCombo}
                        className="inline-flex flex-1 items-center justify-center rounded-2xl bg-[#d62828] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#b71d1d] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {podeAdicionarCombo ? "Adicionar seleção ao carrinho" : "Complete as etapas"}
                      </button>
                      <button
                        type="button"
                        onClick={handleResetSelecoes}
                        className="inline-flex items-center justify-center rounded-2xl border border-[#ffd166] px-4 py-3 text-sm font-semibold text-[#8c5315] transition hover:border-[#fcbf49] hover:text-[#d62828]"
                      >
                        Limpar seleção
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleAvancarEtapa}
                  disabled={!podeAvancarEtapaAtual}
                  className="inline-flex items-center justify-center rounded-2xl bg-[#fcbf49] px-5 py-3 text-sm font-semibold text-[#8c5315] transition hover:bg-[#f4a226] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Ir para revisão do carrinho
                </button>
              </div>
            </section>
          )}

          {etapaAtual === "carrinho" && (
            <section className="rounded-3xl border border-[#ffd166] bg-white/95 p-6 shadow-[0_20px_60px_-45px_rgba(214,40,40,0.5)] flex flex-col gap-6">
              <header className="flex flex-col gap-2">
                <h2 className="text-2xl font-semibold text-[#d62828]">
                  {VENDA_STEP_CONFIG.carrinho.titulo}
                </h2>
                <p className="text-sm text-[#8c5315]">
                  {VENDA_STEP_CONFIG.carrinho.descricao}
                </p>
              </header>

              <div className="flex flex-col gap-6">
                <div className="rounded-2xl border border-[#ffd166] bg-white/90 p-6 shadow-[0_20px_60px_-45px_rgba(214,40,40,0.5)]">
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
                        Nenhum item adicionado. Volte à etapa anterior para incluir produtos.
                      </div>
                    ) : (
                      itens.map((item) => (
                        <article
                          key={item.id}
                          className="flex flex-col gap-4 rounded-2xl border border-[#ffd166] bg-white/80 p-4 shadow-sm transition hover:border-[#fcbf49]"
                        >
                          <header className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-white shadow-sm">
                                <Image
                                  src={obterImagemProduto(item.nome, item.codigoBarras)}
                                  alt={item.nome}
                                  fill
                                  className="object-cover"
                                  sizes="64px"
                                />
                              </div>
                              <div>
                                <h3 className="text-base font-semibold text-[#d62828]">
                                  {item.nome}
                                </h3>
                                <p className="text-xs uppercase tracking-[0.18em] text-[#8c5315]">
                                  Código · {item.codigoBarras}
                                </p>
                              </div>
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

                <div className="rounded-2xl border border-[#ffd166] bg-white/80 p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#f4a226]">
                    Resumo rápido
                  </h3>
                  <dl className="mt-3 space-y-3 text-sm text-[#8c5315]">
                    <div className="flex items-center justify-between">
                      <dt>Total de itens</dt>
                      <dd className="font-semibold text-[#d62828]">{totalItens}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt>Valor parcial</dt>
                      <dd className="font-semibold text-[#d62828]">
                        {formatCurrency(totalCalculado)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="flex flex-wrap justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleVoltarEtapa}
                  className="inline-flex items-center justify-center rounded-2xl border border-[#ffd166] px-5 py-3 text-sm font-semibold text-[#8c5315] transition hover:border-[#fcbf49] hover:text-[#d62828]"
                >
                  Voltar e adicionar itens
                </button>
                <button
                  type="button"
                  onClick={handleAvancarEtapa}
                  disabled={!podeAvancarEtapaAtual}
                  className="inline-flex items-center justify-center rounded-2xl bg-[#fcbf49] px-5 py-3 text-sm font-semibold text-[#8c5315] transition hover:bg-[#f4a226] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Ir para pagamento
                </button>
              </div>
            </section>
          )}

          {etapaAtual === "pagamento" && (
            <section className="rounded-3xl border border-[#ffd166] bg-white/95 p-6 shadow-[0_20px_60px_-45px_rgba(214,40,40,0.5)] flex flex-col gap-6">
              <header className="flex flex-col gap-2">
                <h2 className="text-2xl font-semibold text-[#d62828]">
                  {VENDA_STEP_CONFIG.pagamento.titulo}
                </h2>
                <p className="text-sm text-[#8c5315]">
                  {VENDA_STEP_CONFIG.pagamento.descricao}
                </p>
              </header>

              <div className="flex flex-col gap-6">
                <div className="rounded-2xl border border-[#ffd166] bg-white/90 p-6 shadow-[0_20px_60px_-45px_rgba(214,40,40,0.5)]">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#f4a226]">
                    Forma de pagamento
                  </h3>
                  <div className="mt-4 grid gap-2">
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

                <div className="rounded-2xl border border-[#ffd166] bg-white/80 p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#d62828]">
                    Resumo da venda
                  </h3>
                  <dl className="mt-3 space-y-3 text-sm text-[#8c5315]">
                    <div className="flex items-center justify-between">
                      <dt>Total de itens</dt>
                      <dd className="font-semibold text-[#d62828]">{totalItens}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt>Valor total</dt>
                      <dd className="font-semibold text-[#d62828]">
                        {formatCurrency(totalCalculado)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt>Pagamento</dt>
                      <dd className="font-semibold text-[#8c5315]">{formaPagamento}</dd>
                    </div>
                  </dl>

                  <div className="mt-4 space-y-2 text-sm text-[#8c5315]">
                    <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f4a226]">
                      Itens no pedido
                    </h4>
                    {itens.length === 0 ? (
                      <p>Nenhum item no carrinho. Volte para adicionar produtos.</p>
                    ) : (
                      <ul className="space-y-2">
                        {itens.map((item) => (
                          <li
                            key={`${item.id}-${item.codigoBarras}`}
                            className="flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2">
                              <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md bg-white shadow-sm">
                                <Image
                                  src={obterImagemProduto(item.nome, item.codigoBarras)}
                                  alt={item.nome}
                                  fill
                                  className="object-cover"
                                  sizes="32px"
                                />
                              </div>
                              <span>
                                {item.nome}
                                <span className="text-xs text-[#b5863a]"> × {item.quantidade}</span>
                              </span>
                            </div>
                            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d62828]">
                              {formatCurrency(item.precoUnitario * item.quantidade)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-dashed border-[#ffd166] bg-[#fff5d6] p-5 text-sm text-[#8c5315]">
                  Garanta que todos os itens estejam conferidos e que o pagamento escolhido esteja disponível no caixa.
                </div>
              </div>

              <div className="flex flex-wrap justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleVoltarEtapa}
                  className="inline-flex items-center justify-center rounded-2xl border border-[#ffd166] px-5 py-3 text-sm font-semibold text-[#8c5315] transition hover:border-[#fcbf49] hover:text-[#d62828]"
                >
                  Voltar para revisão
                </button>
                <button
                  type="button"
                  onClick={handleFinalizarVenda}
                  disabled={finalizandoVenda || itens.length === 0}
                  className="inline-flex items-center justify-center rounded-2xl bg-[#d62828] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#b71d1d] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {finalizandoVenda ? "Registrando venda..." : "Finalizar venda"}
                </button>
              </div>

              <p className="text-xs text-[#8c5315]">
                O estoque será atualizado automaticamente após o registro bem-sucedido.
              </p>
            </section>
          )}

          {(erro || sucesso) && (
            <div
              role="status"
              className={`rounded-3xl border px-5 py-4 text-sm ${
                erro
                  ? "border-[#f4a1a1] bg-[#ffe5e5] text-[#b71d1d]"
                  : "border-[#c6f6d5] bg-[#f0fff4] text-[#23613d]"
              }`}
            >
              {erro ?? sucesso}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
