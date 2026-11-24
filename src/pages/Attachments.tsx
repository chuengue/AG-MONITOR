// Comprovantes do pedido (2026-11-24): lista no pedido; tocar abre na tela
// (foto direto, PDF no visualizador do celular) e "Baixar" salva o arquivo.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { attachmentFile, type Attachment } from '../api';

const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const size = (n: number) =>
  n >= 1024 * 1024
    ? `${(n / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`
    : `${Math.max(1, Math.round(n / 1024))} KB`;

const when = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export function Attachments({ saleId, list }: { saleId: number; list: Attachment[] }) {
  const [open, setOpen] = useState<Attachment | null>(null);
  return (
    <div className="section flat">
      <div className="section-head">
        <h2>Comprovantes</h2>
        <span className="muted small">{list.length || 'nenhum'}</span>
      </div>
      {list.length === 0 && <div className="row-sub attach-empty">Nenhum comprovante anexado.</div>}
      {list.map((a) => (
        <button key={a.id} type="button" className="attach" onClick={() => setOpen(a)}>
          <span className={`attach-icon ${a.mime === 'application/pdf' ? 'pdf' : 'img'}`}>
            {a.mime === 'application/pdf' ? 'PDF' : 'FOTO'}
          </span>
          <span className="attach-main">
            <span className="attach-name">{a.name}</span>
            <span className="row-sub">
              {when(a.createdAt)}
              {a.createdBy && ` · ${a.createdBy}`} · {size(a.size)}
            </span>
          </span>
          <span className="attach-go">›</span>
        </button>
      ))}
      {open && <Viewer saleId={saleId} file={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Viewer({ saleId, file, onClose }: { saleId: number; file: Attachment; onClose: () => void }) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const isPdf = file.mime === 'application/pdf';

  // O arquivo já fica na memória: "Abrir"/"Baixar" rodam direto no toque
  // (o iPhone só deixa compartilhar/abrir aba dentro do toque).
  useEffect(() => {
    let alive = true;
    let made = '';
    attachmentFile(saleId, file.id)
      .then((b) => {
        if (!alive) return;
        made = URL.createObjectURL(b);
        setBlob(b);
        setUrl(made);
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : 'Não foi possível abrir o comprovante.'));
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [saleId, file.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  function openPdf() {
    if (!url) return;
    const w = window.open(url, '_blank');
    if (!w) download();
  }

  async function download() {
    if (!blob) return;
    // iPhone: a folha de compartilhar tem "Salvar em Arquivos" / "Salvar imagem".
    const f = new File([blob], file.name, { type: file.mime });
    if (isIOS() && navigator.canShare?.({ files: [f] })) {
      try {
        await navigator.share({ files: [f] });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
      }
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // Fora da janela do pedido (ela usa transform, que prende o position: fixed).
  return createPortal(
    <div className="viewer" role="dialog" aria-modal="true" aria-label={file.name} onClick={(e) => e.stopPropagation()}>
      <div className="viewer-head">
        <span className="viewer-name">{file.name}</span>
        <button className="icon-btn" aria-label="Fechar" onClick={onClose}>
          <svg viewBox="0 0 24 24">
            <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>
      <div className="viewer-body">
        {error && <div className="alert">{error}</div>}
        {!error && !url && <div className="muted">Carregando…</div>}
        {url && !isPdf && <img src={url} alt={file.name} />}
        {url && isPdf && (
          <div className="viewer-pdf">
            <span className="attach-icon pdf big">PDF</span>
            <span className="muted small">{size(file.size)}</span>
            <button className="primary" onClick={openPdf}>
              Abrir PDF
            </button>
          </div>
        )}
      </div>
      <div className="viewer-foot">
        <button className="primary" onClick={download} disabled={!blob}>
          Baixar
        </button>
      </div>
    </div>,
    document.body,
  );
}
