'use client';

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ProdutoVenda = {
  id: number;
  nome: string;
  codigoBarras: string;
};

type ItemVenda = {
  id: number;
  quantidade: number;
  precoMomento: string;
  produto: ProdutoVenda | null;
};

type OperadorVenda = {
  id: number;
  nome: string;
};

type VendaHistorico = {
  id: number;
  dataHora: string;
  totalVenda: string;
  tipoPagamento: string;
  operador: OperadorVenda | null;
  itens: ItemVenda[];
};

type ResumoPagamento = {
  tipoPagamento: string;
  quantidade: number;
  total: string;
};

type ResumoHistorico = {
  totalVendas: number;
  faturamentoTotal: string;
  ticketMedio: string;
  primeiraVenda: string | null;
  ultimaVenda: string | null;
  porPagamento: ResumoPagamento[];
};

type MetaHistorico = {
  page: number;
  limit: number;
  totalRegistros: number;
  totalPaginas: number;
};

type HistoricoResponse = {
  vendas: VendaHistorico[];
  resumo: ResumoHistorico;
  meta: MetaHistorico;
};

type ApiError = {
  message?: string;
};

const formatadorMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

const formatadorDataHora = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeStyle: "short",
});

const formatadorHora = new Intl.DateTimeFormat("pt-BR", {
  timeStyle: "short",
});

const formatarMoeda = (valor: string | number) => {
  const numero = typeof valor === "string" ? Number.parseFloat(valor) : valor;

  if (!Number.isFinite(numero)) {
    return formatadorMoeda.format(0);
  }

  return formatadorMoeda.format(numero);
};

const formatarDataHoraCurta = (iso: string) => {
  const data = new Date(iso);

  if (Number.isNaN(data.getTime())) {
    return "—";
  }

  return formatadorDataHora.format(data);
};

const formatarHora = (iso: string) => {
  const data = new Date(iso);

  if (Number.isNaN(data.getTime())) {
    return "—";
  }

  return formatadorHora.format(data);
};

export default function HistoricoVendasPage() {
  const [vendas, setVendas] = useState<VendaHistorico[]>([]);
  const [resumo, setResumo] = useState<ResumoHistorico | null>(null);
  const [meta, setMeta] = useState<MetaHistorico | null>(null);
  const [pagina, setPagina] = useState(1);
  const [limite, setLimite] = useState(20);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
  const [versaoConsulta, setVersaoConsulta] = useState(0);

  useEffect(() => {
    const controlador = new AbortController();

    const carregarHistorico = async () => {
      setCarregando(true);
      setErro(null);

      try {
        const resposta = await fetch(`/api/venda?limit=${limite}&page=${pagina}`, {
          signal: controlador.signal,
        });
        const dados = (await resposta.json().catch(() => null)) as
          | HistoricoResponse
          | ApiError
          | null;

        if (!resposta.ok || !dados || !("vendas" in dados)) {
          throw new Error(
            (dados as ApiError | null)?.message ?? "Não foi possível carregar o histórico de vendas",
          );
        }

        const payload = dados as HistoricoResponse;
        setVendas(payload.vendas);
        setResumo(payload.resumo);
        setMeta(payload.meta);
        setUltimaAtualizacao(new Date());
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error("[historico] Falha ao carregar vendas", error);
        setVendas([]);
        setResumo(null);
        setMeta(null);
        setErro(error instanceof Error ? error.message : "Falha ao carregar o histórico de vendas");
      } finally {
        setCarregando(false);
      }
    };

    void carregarHistorico();

    return () => controlador.abort();
  }, [pagina, limite, versaoConsulta]);

  const totalRegistros = meta?.totalRegistros ?? 0;
  const totalPaginas = meta?.totalPaginas ?? 1;
  const exibicaoInicial = totalRegistros === 0 ? 0 : (pagina - 1) * limite + 1;
  const exibicaoFinal = totalRegistros === 0 ? 0 : Math.min(exibicaoInicial + vendas.length - 1, totalRegistros);

  const distribuicaoPagamentos = useMemo(() => {
    if (!resumo) {
      return [] as Array<ResumoPagamento & { percentual: number }>;
    }

    const total = resumo.totalVendas || 0;

    return (resumo.porPagamento ?? []).map((item) => {
      const percentual = total > 0 ? Number(((item.quantidade / total) * 100).toFixed(1)) : 0;
      return {
        ...item,
        percentual,
      };
    });
  }, [resumo]);

  const faturamentoTotal = resumo ? formatarMoeda(resumo.faturamentoTotal) : formatadorMoeda.format(0);
  const ticketMedio = resumo ? formatarMoeda(resumo.ticketMedio) : formatadorMoeda.format(0);
  const ultimaVenda = resumo?.ultimaVenda ? formatarDataHoraCurta(resumo.ultimaVenda) : null;
  const primeiraVenda = resumo?.primeiraVenda ? formatarDataHoraCurta(resumo.primeiraVenda) : null;

  const podeAvancar = meta ? pagina < totalPaginas && totalPaginas > 0 : false;
  const podeVoltar = pagina > 1;

  const handleAlterarLimite = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const valor = Number.parseInt(event.target.value, 10);

    if (!Number.isFinite(valor) || Number.isNaN(valor)) {
      return;
    }

    setPagina(1);
    setLimite(valor);
  };

  const handleAtualizar = () => {
    setVersaoConsulta((prev) => prev + 1);
  };

  const checarUltimaAtualizacao = () => {
    if (!ultimaAtualizacao) {
      return "—";
    }

    return formatadorDataHora.format(ultimaAtualizacao);
  };

  return (
    <div className="flex min-h-screen bg-linear-to-br from-white via-white to-[#fff3e0] font-sans text-[#2f1b0c] antialiased">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12 sm:px-10 lg:px-16">
        <header className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/venda"
              className="inline-flex w-fit items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#d62828]/80 transition hover:text-[#d62828]"
            >
              ← voltar para o PDV
            </Link>
            <Link
              href="/"
              className="inline-flex w-fit items-center gap-2 rounded-full border border-[#ffd166] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#d62828] transition hover:border-[#fcbf49] hover:text-[#d62828]"
            >
              Ir para o início
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f4a226]">
              Painel · Histórico de vendas
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-[#d62828] sm:text-5xl">
              Acompanhe a performance do caixa em tempo real
            </h1>
            <p className="max-w-3xl text-base text-[#8c5315]">
              Consulte vendas registradas, formas de pagamento, ticket médio e detalhes de cada pedido em um só lugar. Mantenha a equipe informada e pronta para o próximo rush.
            </p>
          </div>
        </header>

        <section className="grid gap-5 rounded-3xl border border-[#ffd166] bg-white/90 p-6 shadow-[0_25px_70px_-45px_rgba(214,40,40,0.45)] sm:grid-cols-3">
          <article className="flex flex-col gap-1 rounded-2xl border border-[#ffd166]/60 bg-[#fff5d6]/60 p-4">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f4a226]">
              Faturamento total
            </span>
            <strong className="text-2xl font-semibold text-[#d62828]">
              {faturamentoTotal}
            </strong>
            <span className="text-[11px] uppercase tracking-[0.18em] text-[#8c5315]/80">
              Desde a primeira venda registrada
            </span>
          </article>
          <article className="flex flex-col gap-1 rounded-2xl border border-[#ffd166]/60 bg-[#fff5d6]/60 p-4">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f4a226]">
              Vendas registradas
            </span>
            <strong className="text-2xl font-semibold text-[#d62828]">
              {resumo?.totalVendas ?? 0}
            </strong>
            <span className="text-[11px] uppercase tracking-[0.18em] text-[#8c5315]/80">
              Última operação: {ultimaVenda ?? "—"}
            </span>
          </article>
          <article className="flex flex-col gap-1 rounded-2xl border border-[#ffd166]/60 bg-[#fff5d6]/60 p-4">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f4a226]">
              Ticket médio
            </span>
            <strong className="text-2xl font-semibold text-[#d62828]">
              {ticketMedio}
            </strong>
            <span className="text-[11px] uppercase tracking-[0.18em] text-[#8c5315]/80">
              Baseado em {resumo?.totalVendas ?? 0} vendas
            </span>
          </article>
        </section>

        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[#ffd166] bg-white/95 p-5 shadow-[0_20px_60px_-45px_rgba(214,40,40,0.4)]">
              <div className="flex flex-col gap-1 text-sm text-[#8c5315]">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f4a226]">
                  Histórico em exibição
                </span>
                <strong className="text-lg font-semibold text-[#d62828]">
                  {totalRegistros === 0 ? "Nenhuma venda registrada" : `Vendas ${exibicaoInicial} – ${exibicaoFinal} de ${totalRegistros}`}
                </strong>
                <span className="text-[11px] uppercase tracking-[0.18em] text-[#8c5315]/80">
                  Atualizado em {checarUltimaAtualizacao()}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-[#8c5315]">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d62828]/80">
                    Itens por página
                  </span>
                  <select
                    value={limite}
                    onChange={handleAlterarLimite}
                    className="rounded-xl border border-[#ffd166] bg-white px-3 py-2 text-sm font-semibold text-[#d62828] outline-none transition focus:border-[#fcbf49] focus:ring-2 focus:ring-[#ffe066]"
                  >
                    {[10, 20, 30, 50].map((opcao) => (
                      <option key={opcao} value={opcao}>
                        {opcao}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="inline-flex rounded-full border border-[#ffd166] bg-white/80">
                  <button
                    type="button"
                    onClick={() => setPagina((prev) => Math.max(prev - 1, 1))}
                    disabled={!podeVoltar || carregando}
                    className="h-10 w-10 rounded-full text-lg font-semibold text-[#d62828]/70 transition hover:bg-[#ffe8cc] hover:text-[#d62828] disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label="Página anterior"
                  >
                    ←
                  </button>
                  <span className="px-4 text-sm font-semibold text-[#d62828]">
                    {pagina} / {totalPaginas}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPagina((prev) => (podeAvancar ? prev + 1 : prev))}
                    disabled={!podeAvancar || carregando}
                    className="h-10 w-10 rounded-full text-lg font-semibold text-[#d62828]/70 transition hover:bg-[#ffe8cc] hover:text-[#d62828] disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label="Próxima página"
                  >
                    →
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleAtualizar}
                  disabled={carregando}
                  className="inline-flex items-center justify-center rounded-full bg-[#d62828] px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-[#b71d1d] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Atualizar dados
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-[#ffd166] bg-white/95 p-6 shadow-[0_22px_65px_-50px_rgba(214,40,40,0.45)]">
              {carregando ? (
                <div className="flex h-40 items-center justify-center text-sm text-[#8c5315]">
                  Carregando histórico de vendas...
                </div>
              ) : erro ? (
                <div className="rounded-2xl border border-[#f4a1a1] bg-[#ffe5e5] px-4 py-3 text-sm text-[#b71d1d]">
                  {erro}
                </div>
              ) : vendas.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#ffd166] bg-[#fff5d6] p-6 text-sm text-[#8c5315]">
                  Nenhum registro de venda encontrado para os filtros atuais.
                  {primeiraVenda ? (
                    <p className="mt-2 text-xs text-[#b5863a]">
                      A primeira venda ocorreu em {primeiraVenda}. Volte mais tarde para acompanhar novos registros.
                    </p>
                  ) : null}
                </div>
              ) : (
                <ul className="space-y-5">
                  {vendas.map((venda) => {
                    const totalItensVenda = venda.itens.reduce((acc, item) => acc + item.quantidade, 0);
                    const dataCurta = formatarDataHoraCurta(venda.dataHora);
                    const hora = formatarHora(venda.dataHora);

                    return (
                      <li
                        key={venda.id}
                        className="rounded-2xl border border-[#ffd166] bg-white/90 p-5 shadow-sm transition hover:border-[#fcbf49]"
                      >
                        <header className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f4a226]">
                              Venda #{venda.id}
                            </span>
                            <strong className="text-lg font-semibold text-[#d62828]">
                              {formatarMoeda(venda.totalVenda)}
                            </strong>
                            <span className="text-xs uppercase tracking-[0.18em] text-[#8c5315]/80">
                              {dataCurta}
                            </span>
                          </div>
                          <span className="rounded-full bg-[#ffe8cc] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#b15d00]">
                            {venda.tipoPagamento}
                          </span>
                        </header>

                        <div className="mt-4 grid gap-3 rounded-2xl bg-[#fff5d6]/70 p-4 text-sm text-[#8c5315]">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span>
                              Operador: <strong className="text-[#d62828]">{venda.operador?.nome ?? "—"}</strong>
                            </span>
                            <span>
                              Itens: <strong className="text-[#d62828]">{totalItensVenda}</strong>
                            </span>
                            <span>
                              Horário: <strong className="text-[#d62828]">{hora}</strong>
                            </span>
                          </div>
                          <ul className="space-y-2">
                            {venda.itens.map((item) => (
                              <li
                                key={`${venda.id}-${item.id}`}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#ffd166]/70 bg-white px-3 py-2 text-xs"
                              >
                                <span className="font-semibold text-[#d62828]">{item.produto?.nome ?? "Produto removido"}</span>
                                <span className="text-[#8c5315]/80">
                                  Código: {item.produto?.codigoBarras ?? "—"}
                                </span>
                                <span className="text-[#8c5315]/80">
                                  Qtde: <strong className="text-[#d62828]">{item.quantidade}</strong>
                                </span>
                                <span className="text-[#8c5315]/80">
                                  Unitário: {formatarMoeda(item.precoMomento)}
                                </span>
                                <span className="text-[#d62828]">
                                  Subtotal: {formatarMoeda(Number(item.precoMomento) * item.quantidade)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <aside className="flex flex-col gap-6 rounded-3xl border border-[#ffd166] bg-white/95 p-6 shadow-[0_25px_70px_-50px_rgba(214,40,40,0.45)]">
            <div className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold text-[#d62828]">Visão executiva</h2>
              <p className="text-sm text-[#8c5315]">
                Monitoramento das principais métricas do caixa com destaque para comportamento de pagamentos e evolução das vendas.
              </p>
            </div>

            <div className="rounded-2xl border border-[#ffd166]/70 bg-[#fff5d6]/80 p-5 text-sm text-[#8c5315]">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f4a226]">
                Linha do tempo
              </h3>
              <dl className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <dt>Primeira venda</dt>
                  <dd className="font-semibold text-[#d62828]">{primeiraVenda ?? "—"}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Última venda</dt>
                  <dd className="font-semibold text-[#d62828]">{ultimaVenda ?? "—"}</dd>
                </div>
              </dl>
              <p className="mt-4 text-xs text-[#b5863a]">
                Utilize estes marcos para identificar períodos sem movimento e planejar ações promocionais.
              </p>
            </div>

            <div className="rounded-2xl border border-[#ffd166]/70 bg-white p-5">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f4a226]">
                Formas de pagamento
              </h3>
              {distribuicaoPagamentos.length === 0 ? (
                <p className="mt-3 text-sm text-[#8c5315]">
                  Ainda não há registros suficientes para montar a distribuição.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {distribuicaoPagamentos.map((entrada) => (
                    <li
                      key={entrada.tipoPagamento}
                      className="flex flex-col gap-1 rounded-xl border border-[#ffd166]/60 bg-[#fff5d6]/60 px-4 py-3 text-sm text-[#8c5315]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#d62828]">{entrada.tipoPagamento}</span>
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8c5315]/80">
                          {entrada.percentual}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-[#8c5315]/80">
                        <span>{entrada.quantidade} venda(s)</span>
                        <span>{formatarMoeda(entrada.total)}</span>
                      </div>
                      <span className="text-[11px] uppercase tracking-[0.18em] text-[#b5863a]">
                        Representa {entrada.percentual}% das vendas
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-dashed border-[#ffd166] bg-[#fff5d6]/70 p-5 text-sm text-[#8c5315]">
              Exporte os dados periodicamente para análise avançada em planilhas ou BI e garanta decisões pautadas em fatos.
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
