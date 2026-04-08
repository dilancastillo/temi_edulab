export function LogoMark({ compact = false }: Readonly<{ compact?: boolean }>) {
  return (
    <div className="brand-lockup" aria-label="Esbot EduLab">
      <span className="brand-mark" aria-hidden="true">
        EB
      </span>
      {!compact ? (
        <span className="brand-copy">
          <strong>Esbot EduLab</strong>
          <small>Aprendizaje STEAM</small>
        </span>
      ) : null}
    </div>
  );
}

