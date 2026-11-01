export default function Experience() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text">
      <h2 className="absolute left-[6vw] right-[6vw] top-[7vh] font-display text-[4.3vw] font-bold leading-[1.06] text-primary text-balance">Website y API, una misma rutina</h2>
      <div className="absolute bottom-[8vh] left-[6vw] top-[22vh] flex w-[52vw] flex-col justify-center">
        <section className="flex gap-[1.8vw] border-t border-[var(--slide-border)] py-[2.3vh]">
          <span aria-hidden="true" className="mt-[1.2vh] h-[1.25vw] w-[1.25vw] shrink-0 rounded-full bg-primary" />
          <p className="font-body text-[2.05vw] font-medium leading-[1.25] text-text text-pretty">Website en React/Vite; API en Express con PostgreSQL</p>
        </section>
        <section className="flex gap-[1.8vw] border-t border-[var(--slide-border)] py-[2.3vh]">
          <span aria-hidden="true" className="mt-[1.2vh] h-[1.25vw] w-[1.25vw] shrink-0 rounded-full bg-[var(--slide-forest)]" />
          <p className="font-body text-[2.05vw] font-medium leading-[1.25] text-text text-pretty">La hora local usa la zona horaria del perfil: America/Bogota</p>
        </section>
        <section className="flex gap-[1.8vw] border-t border-[var(--slide-border)] py-[2.3vh]">
          <span aria-hidden="true" className="mt-[1.2vh] h-[1.25vw] w-[1.25vw] shrink-0 rounded-full bg-[var(--slide-peach)] ring-1 ring-[var(--slide-forest)]" />
          <p className="font-body text-[2.05vw] font-medium leading-[1.25] text-text text-pretty">Si se pierde la conexión, los registros descargados quedan en una cola del navegador y se pueden sincronizar después</p>
        </section>
      </div>
      <div aria-hidden="true" className="absolute bottom-[8vh] right-[6vw] flex h-[64vh] w-[34vw] items-center justify-center rounded-[3vw] bg-accent">
        <div className="h-[42vh] w-[30vw] overflow-hidden rounded-[1.2vw] border-[0.3vw] border-[var(--slide-forest)] bg-[#fffdf8]">
          <div className="flex h-[4.5vh] items-center gap-[0.6vw] border-b border-[var(--slide-border)] px-[1.2vw]">
            <span className="h-[0.7vw] w-[0.7vw] rounded-full bg-[var(--slide-peach)] ring-1 ring-[var(--slide-forest)]" />
            <span className="h-[0.7vw] w-[0.7vw] rounded-full bg-accent" />
            <span className="h-[0.7vw] w-[0.7vw] rounded-full bg-primary" />
          </div>
          <div className="flex h-[37.5vh]">
            <aside className="flex w-[6vw] flex-col gap-[2vh] bg-accent px-[0.8vw] py-[2vh]">
              <span className="h-[0.8vh] w-[4.2vw] rounded-full bg-primary" />
              <span className="h-[0.7vh] w-[3.2vw] rounded-full bg-[var(--slide-border)]" />
              <span className="h-[0.7vh] w-[3.7vw] rounded-full bg-[var(--slide-border)]" />
              <span className="h-[0.7vh] w-[2.8vw] rounded-full bg-[var(--slide-border)]" />
            </aside>
            <main className="flex-1 p-[1.6vw]">
              <div className="h-[1vh] w-[10vw] rounded-full bg-[var(--slide-forest)]" />
              <div className="mt-[2.4vh] grid grid-cols-2 gap-[1vw]">
                <span className="h-[9vh] rounded-[0.8vw] bg-accent" />
                <span className="h-[9vh] rounded-[0.8vw] bg-[var(--slide-peach)]" />
              </div>
              <div className="mt-[2.5vh] flex flex-col gap-[1.7vh] border-t border-[var(--slide-border)] pt-[2vh]">
                <span className="h-[0.8vh] w-[16vw] rounded-full bg-[var(--slide-border)]" />
                <span className="h-[0.8vh] w-[14vw] rounded-full bg-[var(--slide-border)]" />
                <span className="h-[0.8vh] w-[17vw] rounded-full bg-[var(--slide-border)]" />
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}