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
  onClick,
}: {
  onClick?: () => void;
  title: string;
  subtitle?: string;
  value?: string;
  meta?: string;
  badge?: { text: string; tone: 'danger' | 'ok' | 'info' | 'neutral' };
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} className={`row ${onClick ? 'tap' : ''}`} onClick={onClick}>
      <div className="row-main">
        <div className="row-title">{title}</div>
        {subtitle && <div className="row-sub">{subtitle}</div>}
      </div>
      <div className="row-side">
        {value && <div className="row-value">{value}</div>}
        {badge ? <span className={`badge ${badge.tone}`}>{badge.text}</span> : meta && <div className="row-sub">{meta}</div>}
      </div>
    </Tag>
  );
}

export const Empty = ({ text }: { text: string }) => <div className="empty">{text}</div>;
