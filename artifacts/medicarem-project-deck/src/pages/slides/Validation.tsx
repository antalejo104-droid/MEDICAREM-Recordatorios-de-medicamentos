export default function Validation() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text">
      <h2 className="absolute left-[6vw] right-[6vw] top-[7vh] font-display text-[3.9vw] font-bold leading-[1.06] text-primary text-balance">Prototipo construido; validación pendiente</h2>
      <div className="absolute bottom-[7vh] left-[6vw] right-[6vw] top-[23vh] grid grid-cols-2 gap-[2vw]">
        <section className="flex flex-col justify-center gap-[3.6vh] rounded-[2vw] bg-[var(--slide-forest)] px-[2.6vw] py-[4vh] text-bg">
          <div className="flex items-start gap-[1.4vw]">
            <span aria-hidden="true" className="mt-[1vh] h-[1.2vw] w-[1.2vw] shrink-0 rounded-full bg-[#d3e1d2]" />
            <p className="font-body text-[2.05vw] font-medium leading-[1.25] text-pretty">Build web, tipos del repositorio y endpoint de salud verificados</p>
          </div>
          <div className="flex items-start gap-[1.4vw]">
            <span aria-hidden="true" className="mt-[1vh] h-[1.2vw] w-[1.2vw] shrink-0 rounded-full bg-[#d3e1d2]" />
            <p className="font-body text-[2.05vw] font-medium leading-[1.25] text-pretty">10 pruebas automatizadas de fecha y zona horaria aprobadas</p>
          </div>
        </section>
        <section className="flex flex-col justify-center gap-[3.2vh] rounded-[2vw] bg-[var(--slide-peach)] px-[2.6vw] py-[4vh] text-text">
          <div className="flex items-start gap-[1.4vw]">
            <span aria-hidden="true" className="mt-[1vh] h-[1.2vw] w-[1.2vw] shrink-0 rounded-full bg-primary" />
            <p className="font-body text-[2.05vw] font-medium leading-[1.25] text-pretty">30 pruebas de aceptación documentadas, aún sin ejecutar</p>
          </div>
          <div className="flex items-start gap-[1.4vw]">
            <span aria-hidden="true" className="mt-[1vh] h-[1.2vw] w-[1.2vw] shrink-0 rounded-full bg-primary" />
            <p className="font-body text-[2.05vw] font-medium leading-[1.25] text-pretty">Sin pruebas con usuarios; no se afirma TRL 5</p>
          </div>
          <div className="flex items-start gap-[1.4vw]">
            <span aria-hidden="true" className="mt-[1vh] h-[1.2vw] w-[1.2vw] shrink-0 rounded-full bg-primary" />
            <p className="font-body text-[2.05vw] font-medium leading-[1.25] text-pretty">Antes de un piloto con datos reales: Clerk de producción, revisión de privacidad y pruebas en dispositivos físicos</p>
          </div>
        </section>
      </div>
    </div>
  );
}