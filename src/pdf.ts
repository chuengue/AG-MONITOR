// Quotation PDF on the phone: the same HTML as the desktop app
// (vendor/proposal.ts), sent to the browser's print, where "Salvar como PDF"
// (Android/PC) or Compartilhar (iPhone) gives the file.
import { quoteProposal } from './api';
import { buildProposalHtml, type ProposalData } from './vendor/proposal';

const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export async function printQuotation(id: number) {
  const html = buildProposalHtml((await quoteProposal(id)) as ProposalData);

  // Safari prints the parent page instead of a hidden iframe: own tab there.
  if (isIOS()) {
    const w = window.open('', '_blank');
    if (!w) throw new Error('O navegador bloqueou a nova aba. Permita pop-ups para este site.');
    w.document.open();
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 400);
    return;
  }

  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  frame.srcdoc = html;
  document.body.appendChild(frame);
  await new Promise<void>((resolve) => frame.addEventListener('load', () => resolve(), { once: true }));
  // Images (company logo) must be in before printing.
  const imgs = Array.from(frame.contentDocument?.images ?? []);
  await Promise.all(imgs.map((img) => (img.complete ? null : new Promise((r) => img.addEventListener('load', r, { once: true })))));
  frame.contentWindow?.focus();
  frame.contentWindow?.print();
  // print() returns when the dialog closes (or right away on some phones).
  setTimeout(() => frame.remove(), 60_000);
}
