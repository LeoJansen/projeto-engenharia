'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";

const NAV_LINKS = [
  { href: "/venda", label: "PDV" },
  { href: "/venda/historico", label: "Histórico" },
  { href: "/estoque", label: "Estoque" },
];

export function Topbar() {
  const { operador, isAutenticado, setOperador } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);
  const [erroLogout, setErroLogout] = useState<string | null>(null);

  const destinoAtual = useMemo(() => {
    if (!pathname) {
      return "/";
    }

    if (pathname === "/login") {
      return "/";
    }

    return pathname;
  }, [pathname]);

  const loginHref = isAutenticado
    ? "/"
    : `/login?redirect=${encodeURIComponent(destinoAtual)}`;

  const handleLogout = async () => {
    if (saindo) {
      return;
    }

    setSaindo(true);
    setErroLogout(null);

    try {
      const resposta = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!resposta.ok) {
        throw new Error("Falha ao encerrar sessão");
      }

      setOperador(null);
      router.push(`/login?redirect=${encodeURIComponent(destinoAtual)}`);
      router.refresh();
    } catch (error) {
      console.error("[topbar] Falha ao encerrar sessão", error);
      setErroLogout("Não foi possível sair. Tente novamente.");
    } finally {
      setSaindo(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold tracking-[0.18em] text-slate-900"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500 text-sm font-bold uppercase text-white shadow-md">
              Sx
            </span>
            <span className="hidden sm:inline">Sabor Express</span>
          </Link>

          <nav
            aria-label="Navegação principal"
            className="hidden items-center gap-4 text-sm font-medium text-slate-600 md:flex"
          >
            {NAV_LINKS.map(({ href, label }) => {
              const ativo = pathname?.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`transition hover:text-slate-900 ${
                    ativo ? "text-slate-900" : "text-slate-500"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col items-end gap-1">
          {isAutenticado && operador ? (
            <div className="flex items-center gap-3">
              <div className="hidden text-right text-xs font-medium sm:flex sm:flex-col">
                <span className="text-sm font-semibold text-slate-900">
                  {operador.nome}
                </span>
                <span className="uppercase tracking-[0.22em] text-slate-500">
                  {operador.login}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={saindo}
                className="inline-flex items-center justify-center rounded-full border border-red-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-500 transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saindo ? "Saindo..." : "Sair"}
              </button>
            </div>
          ) : (
            <Link
              href={loginHref}
              className="inline-flex items-center justify-center rounded-full bg-red-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-red-600"
            >
              Entrar
            </Link>
          )}

          {erroLogout && (
            <span className="text-xs font-medium text-red-500">{erroLogout}</span>
          )}
        </div>
      </div>
    </header>
  );
}
