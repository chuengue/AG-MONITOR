// Web Push neste aparelho (2026-11-24): inscrição no navegador + registro na
// API. iPhone: só com o painel instalado na Tela de Início (iOS 16.4+).
import { pushSubscribe, pushUnsubscribe } from './api';

export type DeviceSupport =
  | { ok: true }
  | { ok: false; reason: 'ios-browser' | 'unsupported' | 'no-worker' };

const isIos = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

async function registration() {
  if (!('serviceWorker' in navigator)) return null;
  return (await navigator.serviceWorker.getRegistration()) ?? null;
}

export async function deviceSupport(): Promise<DeviceSupport> {
  const hasApi = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (isIos() && !standalone()) return { ok: false, reason: 'ios-browser' };
  if (!hasApi) return { ok: false, reason: 'unsupported' };
  if (!(await registration())) return { ok: false, reason: 'no-worker' };
  return { ok: true };
}

export const permission = (): NotificationPermission =>
  'Notification' in window ? Notification.permission : 'denied';

export async function currentEndpoint(): Promise<string | null> {
  const reg = await registration();
  const sub = await reg?.pushManager.getSubscription();
  return sub?.endpoint ?? null;
}

function keyBytes(base64url: string) {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const deviceName = () => {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua) || isIos()) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  return 'Navegador';
};

/** Pede permissão (tem que vir de um toque) e liga este aparelho. */
export async function enable(publicKey: string) {
  const reg = await registration();
  if (!reg) throw new Error('Este navegador não aceita notificações do painel.');
  const result = await Notification.requestPermission();
  if (result !== 'granted') {
    throw new Error(
      result === 'denied'
        ? 'As notificações foram bloqueadas. Libere nos ajustes do celular para o AG Painel.'
        : 'Permissão não concedida.',
    );
  }
  const key = keyBytes(publicKey);
  let sub = await reg.pushManager.getSubscription();
  // Inscrição antiga com outra chave do servidor: refaz.
  const same =
    sub?.options.applicationServerKey &&
    new Uint8Array(sub.options.applicationServerKey).every((b, i) => b === key[i]);
  if (sub && !same) {
    await sub.unsubscribe().catch(() => {});
    sub = null;
  }
  sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  return pushSubscribe(sub.toJSON(), deviceName());
}

/** Desliga este aparelho (no servidor e no navegador). */
export async function disable() {
  const reg = await registration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return null;
  const status = await pushUnsubscribe(sub.endpoint);
  await sub.unsubscribe().catch(() => {});
  return status;
}
