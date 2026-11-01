export default function Organization() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text">
      <div className="absolute left-[6vw] right-[6vw] top-[7vh]">
        <h2 className="font-display text-[4.4vw] font-bold leading-[1.06] text-primary text-balance">Organizar no es recomendar</h2>
        <div className="mt-[6vh]">
          <section className="flex items-center gap-[2.5vw] border-t border-[var(--slide-border)] py-[3.1vh]">
            <span aria-hidden="true" className="h-[1.6vw] w-[1.6vw] shrink-0 rounded-full bg-primary" />
            <p className="font-body text-[2.2vw] font-medium leading-[1.22] text-text text-pretty">Horarios, presentación y dosis prescrita en un mismo lugar</p>
          </section>
          <section className="flex items-center gap-[2.5vw] border-t border-[var(--slide-border)] py-[3.1vh]">
            <span aria-hidden="true" className="h-[1.6vw] w-[1.6vw] shrink-0 rounded-full bg-[var(--slide-forest)]" />
            <p className="font-body text-[2.2vw] font-medium leading-[1.22] text-text text-pretty">Registro de toma confirmada, omisión declarada o evento sin confirmar</p>
          </section>
          <section className="flex items-center gap-[2.5vw] border-y border-[var(--slide-border)] py-[3.1vh]">
            <span aria-hidden="true" className="h-[1.6vw] w-[1.6vw] shrink-0 rounded-full bg-[var(--slide-peach)] ring-1 ring-[var(--slide-forest)]" />
            <p className="font-body text-[2.2vw] font-medium leading-[1.22] text-text text-pretty">La app no prescribe, no aconseja cambios y no infiere que una dosis se tomó</p>
          </section>
        </div>
      </div>
    </div>
  );
}