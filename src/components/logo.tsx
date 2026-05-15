export function LogoMark({ compact = false, subtitle, large = false }: Readonly<{ compact?: boolean; subtitle?: string; large?: boolean }>) {
  if (large) {
    return (
      <div className="brand-lockup-large" aria-label="Esbot EduLab">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="Esbot EduLab icono" className="brand-mark-large" src="/ic_logo_primary.png" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="Esbot EduLab" className="brand-logotipo-large" src="/logotipo.png" />
      </div>
    );
  }

  return (
    <div className="brand-lockup" aria-label="Esbot EduLab">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt="Esbot EduLab" className="brand-mark" src="/ic_logo_primary.png" />
      {!compact ? (
        <span className="brand-copy">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="Esbot EduLab" className="brand-logotipo" src="/logotipo.png" />
          <small>{subtitle ?? "Aprendizaje STEAM"}</small>
        </span>
      ) : null}
    </div>
  );
}

