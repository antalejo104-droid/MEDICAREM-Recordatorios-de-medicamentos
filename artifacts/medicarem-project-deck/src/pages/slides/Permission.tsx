export default function Permission() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text">
      <h2 className="absolute left-[6vw] right-[6vw] top-[7vh] font-display text-[4.4vw] font-bold leading-[1.06] text-primary text-balance">Compartir solo con permiso</h2>
      <div className="absolute bottom-[7vh] left-[6vw] right-[6vw] top-[24vh] overflow-hidden rounded-[2.3vw] bg-[var(--slide-forest)] px-[3vw] py-[5vh]">
        <div aria-hidden="true" className="absolute left-[17vw] right-[17vw] top-[13vh] h-[0.3vh] bg-[#8eaa9f]" />
        <div className="relative grid h-full grid-cols-3 gap-[2vw]">
          <section className="flex flex-col justify-between rounded-[1.8vw] bg-primary px-[2.2vw] py-[3vh] text-bg">
            <span aria-hidden="true" className="h-[4.5vw] w-[4.5vw] rounded-full border-[0.3vw] border-[#c9d8c9] bg-[var(--slide-forest)]" />
            <p className="font-body text-[2.2vw] font-medium leading-[1.26] text-pretty">El paciente crea una invitación y decide si la aprueba</p>
          </section>
          <section className="flex flex-col justify-between rounded-[1.8vw] bg-[var(--slide-panel-deep)] px-[2.2vw] py-[3vh] text-bg">
            <span aria-hidden="true" className="h-[4.5vw] w-[4.5vw] rounded-full border-[0.3vw] border-[#c9d8c9] bg-primary" />
            <p className="font-body text-[2.2vw] font-medium leading-[1.26] text-pretty">El cuidador consulta solo la información autorizada</p>
          </section>
          <section className="flex flex-col justify-between rounded-[1.8vw] bg-[var(--slide-peach)] px-[2.2vw] py-[3vh] text-text">
            <span aria-hidden="true" className="h-[4.5vw] w-[4.5vw] rounded-full border-[0.3vw] border-[var(--slide-forest)] bg-accent" />
            <p className="font-body text-[2.2vw] font-medium leading-[1.26] text-pretty">El paciente puede retirar el acceso</p>
          </section>
        </div>
      </div>
    </div>
  );
}