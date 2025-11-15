import Image from "next/image";
import Link from "next/link";

const bestSellers = [
  {
    name: "Combo Família",
    description: "Pizza G + Refri 2L + Fritas",
    price: 24,
    image: "/assets/pizza.svg",
  },
  {
    name: "Burger Especial",
    description: "Blend artesão + cheddar duplo + crocância",
    price: 22,
    image: "/assets/burger.svg",
  },
  {
    name: "Fritas Croc",
    description: "Porção generosa com molho da casa",
    price: 18,
    image: "/assets/fries.svg",
  },
  {
    name: "Milkshake Festa",
    description: "Baunilha cremosa com chantilly",
    price: 16,
    image: "/assets/milkshake.svg",
  },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);

export default function Home() {
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
                  PDV para fast food
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
                  Sabor inesquecível,
                  <br /> Entrega rápida!
                </h1>
                <p className="text-lg text-[#ffe5a2] sm:text-xl">
                  Seus favoritos, quentinhos e frescos, direto na sua operação. Controle total do caixa e do atendimento em poucos toques.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link
                    href="/venda"
                    className="inline-flex items-center justify-center rounded-full bg-[#fcbf49] px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#5f3200] shadow-[0_18px_40px_-20px_rgba(244,162,38,0.8)] transition hover:bg-[#f4a226]"
                  >
                    Ver cardápio do PDV
                  </Link>
                  <Link
                    href="#mais-vendidos"
                    className="inline-flex items-center justify-center rounded-full border border-white/40 px-6 py-3 text-sm font-medium text-white transition hover:border-white hover:bg-white/10"
                  >
                    Ver mais detalhes
                  </Link>
                </div>
              </div>
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-[#fcbf49]/20 blur-3xl" />
                <div className="relative flex h-80 w-full max-w-sm items-center justify-center rounded-[2.5rem] border border-white/20 bg-white/10 p-6 backdrop-blur">
                  <Image
                    src="/assets/hero-burger.svg"
                    alt="Hambúrguer especial"
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
              nossos mais vendidos
            </span>
            <h2 className="text-3xl font-bold text-[#d62828] sm:text-4xl">
              Combos que saem da chapa em segundos
            </h2>
            <p className="mx-auto max-w-3xl text-base text-[#8c5315]">
              Personalize o cardápio do PDV e acompanhe de perto quanto cada produto rende. Use como vitrine para o time e para os clientes.
            </p>
          </header>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {bestSellers.map((item) => (
              <article
                key={item.name}
                className="group flex h-full flex-col rounded-3xl border border-[#fcbf49] bg-[#fffdf7] p-6 transition hover:-translate-y-1.5 hover:border-[#f4a226] hover:shadow-[0_20px_60px_-40px_rgba(214,40,40,0.5)]"
              >
                <div className="relative overflow-hidden rounded-2xl bg-[#fff4cc]">
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={360}
                    height={240}
                    className="h-auto w-full object-cover"
                  />
                </div>
                <div className="mt-4 flex flex-1 flex-col gap-3">
                  <header className="flex items-start justify-between gap-4">
                    <div className="flex flex-col">
                      <h3 className="text-lg font-semibold text-[#d62828]">
                        {item.name}
                      </h3>
                      <p className="text-sm text-[#8c5315]">{item.description}</p>
                    </div>
                    <span className="rounded-full bg-[#ffe066] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#7a4504]
                      ">
                      Destaque
                    </span>
                  </header>
                  <div className="mt-auto flex items-center justify-between">
                    <p className="text-2xl font-bold text-[#d62828]">
                      {formatCurrency(item.price)}
                    </p>
                    <Link
                      href="/venda"
                      className="inline-flex items-center justify-center rounded-full border border-[#d62828] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#d62828] transition hover:bg-[#d62828] hover:text-white"
                    >
                      adicionar
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-16 w-full max-w-6xl px-6 pb-16 sm:px-10 lg:px-16">
          <div className="grid gap-10 rounded-4xl border border-[#ffd166] bg-[#fff8e5] p-10 shadow-[0_35px_80px_-55px_rgba(214,40,40,0.4)] md:grid-cols-[1.2fr_1fr]">
            <div className="flex flex-col gap-6">
              <h2 className="text-3xl font-bold text-[#d62828]">
                Tudo que o seu balcão precisa em um só lugar
              </h2>
              <ul className="space-y-4 text-[#7a4504]">
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#d62828] text-xs font-semibold text-white">
                    1
                  </span>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#d62828]/90">
                      Atendimento veloz
                    </p>
                    <p className="text-sm">
                      Busque produtos em segundos e mantenha a fila andando com confiança.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#d62828] text-xs font-semibold text-white">
                    2
                  </span>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#d62828]/90">
                      Controle financeiro
                    </p>
                    <p className="text-sm">
                      Calcule totais automaticamente, escolha a forma de pagamento e evite diferenças de caixa.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#d62828] text-xs font-semibold text-white">
                    3
                  </span>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#d62828]/90">
                      Indicadores confiáveis
                    </p>
                    <p className="text-sm">
                      Estoque, vendas e operadores em tempo real para decisões certeiras no ápice do rush.
                    </p>
                  </div>
                </li>
              </ul>
            </div>
            <aside className="flex flex-col justify-between gap-6 rounded-3xl border border-[#fcbf49] bg-white p-8 text-[#7a4504]">
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-[#d62828]">
                  Quer ver em ação?
                </h3>
                <p className="text-sm">
                  Ative o PDV de vendas e surpreenda sua equipe com um fluxo pensado para fast food. Tudo integrado com seus processos e relatórios.
                </p>
              </div>
              <Link
                href="/venda"
                className="inline-flex items-center justify-center rounded-full bg-[#d62828] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-[0_18px_40px_-20px_rgba(214,40,40,0.6)] transition hover:bg-[#b71d1d]"
              >
                Abrir PDV agora
              </Link>
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}
