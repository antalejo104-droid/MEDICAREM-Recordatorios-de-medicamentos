export default function Experience() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text">
      <h2 className="absolute left-[6vw] right-[6vw] top-[7vh] font-display text-[4.3vw] font-bold leading-[1.06] text-primary text-balance">Web y móvil, una misma rutina</h2>
      <div className="absolute bottom-[8vh] left-[6vw] top-[22vh] flex w-[55vw] flex-col justify-center">
        <section className="flex gap-[1.8vw] border-t border-[var(--slide-border)] py-[2.3vh]">
          <span aria-hidden="true" className="mt-[1.2vh] h-[1.25vw] w-[1.25vw] shrink-0 rounded-full bg-primary" />
          <p className="font-body text-[2.05vw] font-medium leading-[1.25] text-text text-pretty">Web en React/Vite; móvil en Expo; API en Express con PostgreSQL</p>
        </section>
        <section className="flex gap-[1.8vw] border-t border-[var(--slide-border)] py-[2.3vh]">
          <span aria-hidden="true" className="mt-[1.2vh] h-[1.25vw] w-[1.25vw] shrink-0 rounded-full bg-[var(--slide-forest)]" />
          <p className="font-body text-[2.05vw] font-medium leading-[1.25] text-text text-pretty">La hora local usa la zona horaria del perfil: America/Bogota</p>
        </section>
        <section className="flex gap-[1.8vw] border-t border-[var(--slide-border)] py-[2.3vh]">
          <span aria-hidden="true" className="mt-[1.2vh] h-[1.25vw] w-[1.25vw] shrink-0 rounded-full bg-[var(--slide-peach)] ring-1 ring-[var(--slide-forest)]" />
          <p className="font-body text-[2.05vw] font-medium leading-[1.25] text-text text-pretty">En móvil, los recordatorios locales son optativos y no muestran nombre ni dosis</p>
        </section>
        <section className="flex gap-[1.8vw] border-y border-[var(--slide-border)] py-[2.3vh]">
          <span aria-hidden="true" className="mt-[1.2vh] h-[1.25vw] w-[1.25vw] shrink-0 rounded-full bg-primary" />
          <p className="font-body text-[2.05vw] font-medium leading-[1.25] text-text text-pretty">Sin conexión se registran eventos ya descargados y se sincronizan al reconectar</p>
        </section>
      </div>
      <div aria-hidden="true" className="absolute bottom-[8vh] right-[7vw] flex h-[67vh] w-[26vw] items-center justify-center rounded-[3vw] bg-accent">
        <div className="relative h-[57vh] w-[18vw] rounded-[2.5vw] border-[0.35vw] border-[var(--slide-forest)] bg-[#fffdf8] p-[2vw]">
          <div className="mx-auto h-[0.7vh] w-[5vw] rounded-full bg-[var(--slide-border)]" />
          <div className="mt-[4vh] h-[1.2vh] w-[9vw] rounded-full bg-[var(--slide-forest)]" />
          <div className="mt-[4vh] flex items-center gap-[1vw] border-t border-[var(--slide-border)] pt-[2.6vh]">
            <span className="h-[1.4vw] w-[1.4vw] rounded-full bg-primary" />
            <span className="h-[0.9vh] w-[8vw] rounded-full bg-[var(--slide-border)]" />
          </div>
          <div className="mt-[3vh] flex items-center gap-[1vw] border-t border-[var(--slide-border)] pt-[2.6vh]">
            <span className="h-[1.4vw] w-[1.4vw] rounded-full bg-[var(--slide-peach)] ring-1 ring-[var(--slide-forest)]" />
            <span className="h-[0.9vh] w-[7vw] rounded-full bg-[var(--slide-border)]" />
          </div>
          <div className="mt-[3vh] flex items-center gap-[1vw] border-t border-[var(--slide-border)] pt-[2.6vh]">
            <span className="h-[1.4vw] w-[1.4vw] rounded-full bg-accent" />
            <span className="h-[0.9vh] w-[8.5vw] rounded-full bg-[var(--slide-border)]" />
          </div>
        </div>
      </div>
    </div>
  );
}