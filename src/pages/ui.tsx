import type { ReactNode } from 'react';
import { change, pct } from '../format';

/** Big number with the variation against the previous period. */
export function Kpi({
  label,
  value,
  current,
  previous,
  hint,
  tone,
  onClick,
}: {
  label: string;
  value: string;
  current?: string | number;
  previous?: string | number;
  hint?: string;
  tone?: 'danger';
  onClick?: () => void;
}) {
  const delta = current !== undefined && previous !== undefined ? change(current, previous) : null;
  return (
    <button type="button" className={`kpi ${tone ?? ''}`} onClick={onClick} disabled={!onClick}>
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value}</span>
      {delta !== null ? (
        <span className={`delta ${delta >= 0 ? 'up' : 'down'}`}>
          {delta >= 0 ? '▲' : '▼'} {pct(delta)} <span className="muted">vs. anterior</span>
        </span>
      ) : (
        hint && <span className="muted small">{hint}</span>
      )}
    </button>
  );
}

export function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="section">
      <div className="section-head">
        <h2>{title}</h2>
        {aside && <span className="muted small">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

export function Row({
  title,
  subtitle,
  value,
  meta,
  badge,
  badge2,
  clip,
  onClick,
}: {
  onClick?: () => void;
  title: string;
  subtitle?: string;
  value?: string;
  meta?: string;
  badge?: { text: string; tone: 'danger' | 'ok' | 'info' | 'neutral' };
  /** Segunda etiqueta, abaixo da primeira. */
  badge2?: { text: string; tone: 'danger' | 'ok' | 'info' | 'neutral' };
  /** Tem comprovante anexado. */
  clip?: boolean;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} className={`row ${onClick ? 'tap' : ''}`} onClick={onClick}>
      <div className="row-main">
        <div className="row-title">
          {clip && (
            <svg className="clip" viewBox="0 0 24 24" role="img" aria-label="Tem comprovante">
              <path d="M16.5 6v11.5a4 4 0 0 1-8 0V5a2.5 2.5 0 0 1 5 0v10.5a1 1 0 0 1-2 0V6H10v9.5a2.5 2.5 0 0 0 5 0V5a4 4 0 0 0-8 0v12.5a5.5 5.5 0 0 0 11 0V6z" />
            </svg>
          )}
          {title}
        </div>
        {subtitle && <div className="row-sub">{subtitle}</div>}
      </div>
      <div className="row-side">
        {value && <div className="row-value">{value}</div>}
        {badge ? <span className={`badge ${badge.tone}`}>{badge.text}</span> : meta && <div className="row-sub">{meta}</div>}
        {badge2 && <span className={`badge ${badge2.tone}`}>{badge2.text}</span>}
      </div>
    </Tag>
  );
}

export const Empty = ({ text }: { text: string }) => <div className="empty">{text}</div>;
