const base = import.meta.env.BASE_URL;

export default function Cover() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text">
      <div className="absolute inset-y-[8vh] left-[6vw] z-10 flex w-[39vw] flex-col justify-center gap-[4vh]">
        <h1 className="font-display text-[6.8vw] font-extrabold leading-[0.98] text-primary text-balance">MEDICAREM</h1>
        <p className="font-body text-[2.45vw] font-medium leading-[1.28] text-text text-pretty">Una rutina de medicamentos más clara, con el control en manos de la persona.</p>
        <p className="font-body text-[2vw] leading-[1.35] text-muted text-pretty">Prototipo para personas mayores de 60 años y sus cuidadores en Pasto, Colombia.</p>
      </div>
      <div className="absolute inset-y-[7vh] right-[5vw] w-[46vw] overflow-hidden rounded-[2.4vw] bg-accent">
        <img src={base + "medicarem-cover.png"} crossOrigin="anonymous" alt="Una persona mayor y una persona cuidadora revisan juntas un horario en un teléfono" className="h-full w-full object-cover" />
      </div>
    </div>
  );
}