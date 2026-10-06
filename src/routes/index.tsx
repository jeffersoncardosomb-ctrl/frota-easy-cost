import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Custo Frota — Painel de Custos de Maquinário" },
      {
        name: "description",
        content:
          "Painel de controle de custos da frota: horas trabalhadas, custo por hora e valor total por máquina.",
      },
      { property: "og:title", content: "Custo Frota — Painel de Custos de Maquinário" },
      {
        property: "og:description",
        content:
          "Acompanhe horas trabalhadas, custo por hora e custo total de cada máquina da frota.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Maquina = {
  nome: string;
  tipo: string;
  horas: number;
  custoHora: number;
  ativa: boolean;
};

const maquinas: Maquina[] = [
  { nome: "Volvo FH 500", tipo: "Caminhão bitrem", horas: 40, custoHora: 145, ativa: true },
  { nome: "John Deere 6155", tipo: "Trator agrícola", horas: 32, custoHora: 128, ativa: true },
  { nome: "CAT 320D", tipo: "Escavadeira hidráulica", horas: 28, custoHora: 160, ativa: true },
  { nome: "Komatsu D61", tipo: "Trator de esteiras", horas: 18, custoHora: 152, ativa: true },
  { nome: "JCB 3CX", tipo: "Retroescavadeira", horas: 10, custoHora: 98, ativa: false },
  { nome: "Case 580N", tipo: "Retroescavadeira", horas: 0, custoHora: 95, ativa: false },
];

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: BRL: undefined as never, minimumFractionDigits: 0 } as never);

const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR")}`;

function Index() {
  const totalHoras = maquinas.reduce((s, m) => s + m.horas, 0);
  const totalCusto = maquinas.reduce((s, m) => s + m.horas * m.custoHora, 0);
  const custoMedio = totalHoras > 0 ? Math.round(totalCusto / totalHoras) : 0;
  const ativas = maquinas.filter((m) => m.ativa).length;
  const maxHoras = Math.max(...maquinas.map((m) => m.horas), 1);

  const ticker = `Frota ativa · ${maquinas.length} máquinas · ${totalHoras}h hoje · ${fmt(totalCusto)} consumo · custo médio ${fmt(custoMedio)}/h · ${ativas} em operação`;

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-6 py-4 md:px-10">
        <div className="flex items-center gap-3">
          <span className="size-3 rotate-45 bg-primary" />
          <span className="text-lg font-bold tracking-tight">
            Custo<span className="text-primary">Frota</span>
          </span>
        </div>
        <nav className="hidden items-center gap-8 text-xs uppercase tracking-[0.2em] text-muted-foreground md:flex">
          <span className="text-primary">Painel</span>
          <span>Máquinas</span>
          <span>Custos</span>
          <span>Relatórios</span>
        </nav>
        <div className="flex items-center gap-3">
          <span className="hidden text-[11px] uppercase tracking-[0.2em] text-muted-foreground sm:inline">
            Turno 12–20h
          </span>
          <span className="size-2.5 rounded-full bg-primary animate-blink" />
          <span className="text-xs font-semibold uppercase tracking-wider">Ao vivo</span>
        </div>
      </header>

      {/* Ticker */}
      <div className="overflow-hidden border-b border-border bg-card py-3">
        <div className="flex w-max gap-8 whitespace-nowrap animate-marquee">
          <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{ticker}</span>
          <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{ticker}</span>
        </div>
      </div>

      {/* Hero */}
      <section className="px-6 py-10 md:px-10 md:py-14">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="mb-4 text-[11px] uppercase tracking-[0.3em] text-primary">
              Custo operacional · hoje
            </p>
            <h1 className="font-display uppercase leading-[0.85]">
              <span className="block text-[clamp(3rem,11vw,9rem)] text-foreground/20">Horas</span>
              <span className="block text-[clamp(3rem,11vw,9rem)]">Trabalhadas</span>
            </h1>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-display text-[clamp(2.5rem,6vw,4.5rem)] font-bold leading-none text-primary">
              {totalHoras}h
            </div>
            <p className="mt-2 max-w-[15rem] text-sm text-muted-foreground">
              {ativas} máquinas em operação simultânea
            </p>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-1 border-y border-border md:grid-cols-3">
        <div className="border-b border-border p-6 md:border-b-0 md:border-r md:p-8">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Valor do custo</p>
          <p className="mt-3 font-display text-4xl font-bold text-primary">{fmt(totalCusto)}</p>
          <p className="mt-1 text-xs text-muted-foreground">consumo total do turno</p>
        </div>
        <div className="border-b border-border p-6 md:border-b-0 md:border-r md:p-8">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Custo / hora</p>
          <p className="mt-3 font-display text-4xl font-bold">{fmt(custoMedio)}</p>
          <p className="mt-1 text-xs text-muted-foreground">média ponderada da frota</p>
        </div>
        <div className="p-6 md:p-8">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Horas trabalhadas
          </p>
          <p className="mt-3 font-display text-4xl font-bold">{totalHoras}h</p>
          <p className="mt-1 text-xs text-muted-foreground">acumulado do dia</p>
        </div>
      </section>

      {/* Máquinas */}
      <section className="px-6 py-12 md:px-10">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold uppercase tracking-tight">Máquinas</h2>
          <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            {maquinas.length} ativos · {ativas} em operação
          </span>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {maquinas.map((m) => {
            const custoTotal = m.horas * m.custoHora;
            return (
              <article
                key={m.nome}
                className="overflow-hidden rounded-lg border border-border bg-card"
              >
                <div className={`h-1.5 ${m.ativa ? "bg-primary" : "bg-foreground/15"}`} />
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                        {m.tipo}
                      </p>
                      <h3 className="mt-1 font-display text-2xl font-bold">{m.nome}</h3>
                    </div>
                    <span
                      className={`rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        m.ativa
                          ? "bg-primary/15 text-primary"
                          : "bg-foreground/10 text-muted-foreground"
                      }`}
                    >
                      {m.ativa ? "Ativa" : "Parada"}
                    </span>
                  </div>
                  <div className="mt-5 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Horas trabalhadas</span>
                      <span className="font-semibold">{m.horas}h</span>
                    </div>
                    <div className="h-1.5 rounded bg-border">
                      <div
                        className={`h-full rounded ${m.ativa ? "bg-primary" : "bg-foreground/20"}`}
                        style={{ width: `${Math.max((m.horas / maxHoras) * 100, 4)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Custo / hora</span>
                      <span className="font-semibold">{fmt(m.custoHora)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Valor do custo</span>
                      <span
                        className={`font-bold ${m.ativa ? "text-primary" : "text-muted-foreground"}`}
                      >
                        {fmt(custoTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-14 md:px-10">
        <div className="relative overflow-hidden rounded-lg border border-border bg-card p-8 md:p-12">
          <div className="absolute -right-10 -top-10 size-64 rounded-full bg-primary/10" />
          <div className="relative flex flex-wrap items-center justify-between gap-8">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-primary">Ajuste de frota</p>
              <h2 className="mt-3 font-display text-3xl font-bold uppercase tracking-tight">
                Reduzir custo/h em 8%
              </h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Realocar a escavadeira para o turno noturno baixa o custo médio da frota em R$ 9/h.
              </p>
            </div>
            <button className="shrink-0 rounded bg-primary px-8 py-4 font-bold uppercase tracking-wider text-primary-foreground transition hover:brightness-110">
              Simular cenário
            </button>
          </div>
        </div>
        <p className="mt-8 text-[11px] uppercase tracking-[0.2em] text-muted-foreground/60">
          Custo Frota · dados fictícios · atualização em tempo real
        </p>
      </section>
    </div>
  );
}
