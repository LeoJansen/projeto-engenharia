'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";

type LoginFormProps = {
  redirectTo: string;
};

type ApiResponse = {
  message?: string;
  operador?: {
    id: number;
    nome: string;
    login: string;
  };
};

export function LoginForm({ redirectTo }: LoginFormProps) {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!login.trim() || !senha) {
      setErro("Informe login e senha para continuar");
      return;
    }

    setErro(null);
    setCarregando(true);

    try {
      const resposta = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, senha }),
      });

      const dados = (await resposta.json().catch(() => null)) as ApiResponse | null;

      if (!resposta.ok || !dados?.operador) {
        const mensagem = dados?.message ?? "Não foi possível autenticar. Verifique suas credenciais.";
        throw new Error(mensagem);
      }

      setLogin("");
      setSenha("");
      router.push(redirectTo);
      router.refresh();
    } catch (error) {
      console.error("[login] Falha ao autenticar", error);
      setErro(error instanceof Error ? error.message : "Falha ao autenticar. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="flex min-h-full flex-1 bg-linear-to-br from-white via-white to-[#fff3de] font-sans text-[#2f1b0c] antialiased">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-12 px-6 py-16 sm:px-10 lg:px-16">
        <header className="flex flex-col gap-3 text-center">
          <span className="mx-auto rounded-full bg-[#ffe8cc] px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-[#d62828]">
            acesso restrito
          </span>
          <h1 className="text-3xl font-bold text-[#d62828] sm:text-4xl">
            Entre para gerenciar o PDV e o estoque
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-[#8c5315]">
            Use suas credenciais de operador para abrir o caixa, registrar vendas e manter o estoque sincronizado.
          </p>
        </header>

        <section className="mx-auto w-full max-w-md rounded-3xl border border-[#ffd166] bg-white/95 p-8 shadow-[0_30px_70px_-45px_rgba(214,40,40,0.45)]">
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <label htmlFor="login" className="text-sm font-semibold text-[#d62828]">
                Login do operador
              </label>
              <input
                id="login"
                name="login"
                autoComplete="username"
                value={login}
                onChange={(event) => setLogin(event.target.value)}
                placeholder="Ex: operador.joao"
                className="rounded-2xl border border-[#ffd166] bg-white px-4 py-3 text-sm text-[#2f1b0c] outline-none transition focus:border-[#fcbf49] focus:ring-2 focus:ring-[#ffe066]"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="senha" className="text-sm font-semibold text-[#d62828]">
                Senha
              </label>
              <input
                id="senha"
                name="senha"
                type="password"
                autoComplete="current-password"
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                placeholder="Informe sua senha"
                className="rounded-2xl border border-[#ffd166] bg-white px-4 py-3 text-sm text-[#2f1b0c] outline-none transition focus:border-[#fcbf49] focus:ring-2 focus:ring-[#ffe066]"
              />
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="inline-flex items-center justify-center rounded-2xl bg-[#d62828] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#b71d1d] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {carregando ? "Entrando..." : "Entrar"}
            </button>

            {erro && (
              <div className="rounded-2xl border border-[#f4a1a1] bg-[#ffe5e5] px-4 py-3 text-xs text-[#b71d1d]">
                {erro}
              </div>
            )}

            <p className="text-center text-[11px] uppercase tracking-[0.18em] text-[#8c5315]/70">
              Após autenticar, você será redirecionado automaticamente
            </p>
          </form>
        </section>
      </main>
    </div>
  );
}
