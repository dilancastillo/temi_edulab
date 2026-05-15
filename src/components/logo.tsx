export function LogoMark({ compact = false, subtitle }: Readonly<{ compact?: boolean; subtitle?: string }>) {
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

