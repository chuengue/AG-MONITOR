// "Notificações" (menu da conta): ativar neste aparelho, quais avisos receber
// e teste. Cada pessoa escolhe os próprios avisos (2026-11-24).
import { useEffect, useState } from 'react';
import { pushPreference, pushStatus, pushTest, type PushStatus } from '../api';
import { currentEndpoint, deviceSupport, disable, enable, permission, type DeviceSupport } from '../push';

export function NotificationsSheet({ onClose }: { onClose: () => void }) {
  const [support, setSupport] = useState<DeviceSupport | null>(null);
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = await deviceSupport();
        const ep = s.ok ? await currentEndpoint() : null;
        const st = await pushStatus(ep);
        if (!alive) return;
        setSupport(s);
        setEndpoint(ep);
        setStatus(st);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Erro ao carregar.');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    setInfo('');
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível concluir.');
    } finally {
      setBusy(false);
    }
  }

  const turnOn = () =>
    run(async () => {
      const st = await enable(status!.publicKey!);
      setStatus(st);
      setEndpoint(await currentEndpoint());
      setInfo('Notificações ativadas neste aparelho.');
    });
  const turnOff = () =>
    run(async () => {
      const st = await disable();
      if (st) setStatus(st);
      else setStatus(await pushStatus(null));
      setEndpoint(null);
      setInfo('Notificações desativadas neste aparelho.');
    });
  const toggle = (key: string, on: boolean) =>
    run(async () => setStatus(await pushPreference(key, on, endpoint)));
  const test = () =>
    run(async () => {
      const r = await pushTest();
      setInfo(r.sent ? 'Notificação de teste enviada. Ela chega em alguns segundos.' : 'Nenhum aparelho ativado recebeu o teste.');
    });

  const active = Boolean(status?.thisDevice && endpoint);
  const blocked = permission() === 'denied';

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip">
          <span />
        </div>
        <div className="sheet-head">
          <h2>Notificações</h2>
          <button className="icon-btn" aria-label="Fechar" onClick={onClose}>
            <svg viewBox="0 0 24 24">
              <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        <div className="sheet-body">
          {error && <div className="alert">{error}</div>}
          {info && <div className="notice">{info}</div>}
          {!status && !error && <div className="skeleton" />}

          {status && !status.publicKey && (
            <div className="section">
              <p className="muted">As notificações ainda não estão ligadas no servidor.</p>
            </div>
          )}

          {status?.publicKey && support && (
            <>
              <div className="section">
                <div className="section-head">
                  <h2>Neste aparelho</h2>
                  <span className={`badge ${active ? 'ok' : ''}`}>{active ? 'Ativado' : 'Desativado'}</span>
                </div>
                {!support.ok && support.reason === 'ios-browser' && (
                  <p className="muted">
                    No iPhone, as notificações só funcionam com o painel instalado: toque em <b>Compartilhar</b> →{' '}
                    <b>Adicionar à Tela de Início</b> e abra o AG Painel pelo ícone. Precisa do iOS 16.4 ou mais novo.
                  </p>
                )}
                {!support.ok && support.reason !== 'ios-browser' && (
                  <p className="muted">Este navegador não aceita notificações. No Android, use o Chrome.</p>
                )}
                {support.ok && blocked && !active && (
                  <p className="muted">
                    As notificações estão bloqueadas para o AG Painel. Libere nos ajustes do celular (Notificações) e
                    volte aqui.
                  </p>
                )}
                {support.ok && (
                  <div className="push-actions">
                    {active ? (
                      <>
                        <button className="primary" onClick={test} disabled={busy}>
                          Enviar notificação de teste
                        </button>
                        <button className="ghost danger" onClick={turnOff} disabled={busy}>
                          Desativar neste aparelho
                        </button>
                      </>
                    ) : (
                      <button className="primary" onClick={turnOn} disabled={busy || blocked}>
                        {busy ? 'Ativando…' : 'Ativar notificações'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="section">
                <div className="section-head">
                  <h2>Avisos</h2>
                </div>
                {status.events.map((e) => (
                  <label key={e.key} className="toggle-row">
                    <span>
                      <span className="row-title">{e.label}</span>
                      <span className="row-sub">{e.description}</span>
                    </span>
                    <input
                      type="checkbox"
                      className="switch"
                      checked={e.on}
                      disabled={busy}
                      onChange={(ev) => toggle(e.key, ev.target.checked)}
                    />
                  </label>
                ))}
                <p className="muted small">
                  Vale para todos os seus aparelhos. Você não recebe aviso do que você mesmo fez.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
