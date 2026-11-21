// Calls to the ERP API (VITE_API_URL). Bearer token kept in localStorage: the
// owner's own phone; the panel token lasts 30 days and only reads the panel.

const BASE = (import.meta.env.VITE_API_URL as string).replace(/\/$/, '');
const TOKEN_KEY = 'ag.painel.token';
const USER_KEY = 'ag.painel.usuario';

export type User = { id: number; name: string; username: string; permissions: string[] };

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string | null) => {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    /* private mode: session only */
  }
};

let token = read(TOKEN_KEY);
let onExpired: () => void = () => {};

export const hasToken = () => Boolean(token);
export const rememberedUsername = () => read(USER_KEY) ?? '';
export const setOnExpired = (fn: () => void) => {
  onExpired = fn;
};

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Sem conexão com o servidor. Verifique a internet.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) {
      logout();
      onExpired();
    }
    throw new ApiError(res.status, data.error ?? `Erro ${res.status}`);
  }
  return data as T;
}

export async function login(username: string, password: string): Promise<User> {
  // client "painel": token de 30 dias que só consulta o painel.
  const r = await call<{ token: string; user: User }>('POST', '/auth/login', { username, password, client: 'painel' });
  if (!r.user.permissions.includes('painel.executivo')) {
    throw new ApiError(403, 'Seu usuário não tem acesso ao painel executivo.');
  }
  token = r.token;
  write(TOKEN_KEY, r.token);
  write(USER_KEY, username);
  return r.user;
}

export function logout() {
  token = null;
  write(TOKEN_KEY, null);
}

export const me = () => call<{ user: User }>('GET', '/auth/me').then((r) => r.user);

export type PeriodKey = 'hoje' | 'semana' | 'mes' | 'ano';

type Revenue = {
  count: number;
  amount: string;
  averageTicket: string;
  weight: string;
  margin: { amount: string; percent: string | null; ordersWithoutCost: number };
};

export type Executive = {
  period: { key: PeriodKey; from: string; to: string; previous: { from: string; to: string } };
  revenue: { current: Revenue; previous: Revenue; openQuotations: { count: number; amount: string } };
  monthly: { month: string; count: number; amount: string }[];
  sellers: {
    seller: { id: number; name: string };
    orders: number;
    amount: string;
    quotationsIssued: number;
    quotationsConverted: number;
    conversionRate: string | null;
  }[];
  clients: { client: { id: number; name: string }; orders: number; amount: string; share: string | null }[];
  production: {
    open: number;
    byStatus: { status: string; count: number }[];
    late: number;
    dueThisWeek: number;
    delivered: number;
    previousDelivered: number;
  };
  /** Only while contas a receber is on in the API. */
  receivables?: {
    open: { count: number; amount: string };
    overdue: { count: number; amount: string };
    dueNext7Days: string;
    awaitingInvoice: { count: number; amount: string };
    received: { count: number; amount: string };
    previousReceived: { count: number; amount: string };
  };
};

export type OverdueTitle = {
  id: number;
  saleId: number;
  saleNumber: string;
  client: string;
  seller: string;
  installment: number;
  installments: number;
  dueDate: string | null;
  balance: string;
  daysOverdue: number;
};

export type MonitorLists = {
  period: { key: PeriodKey; from: string; to: string };
  sales: {
    id: number;
    number: string;
    date: string | null;
    client: string;
    seller: string;
    amount: string;
    weightKg: string | null;
    productionStatus: string | null;
  }[];
  openQuotes: {
    id: number;
    number: string;
    issueDate: string | null;
    validUntil: string | null;
    status: string;
    client: string;
    seller: string;
    amount: string;
    daysOpen: number | null;
  }[];
  production: {
    id: number;
    number: string;
    status: string;
    deliveryDate: string | null;
    late: boolean;
    client: string;
    seller: string;
    amount: string;
  }[];
  overdue?: OverdueTitle[];
};

export const executive = (period: PeriodKey) => call<Executive>('GET', `/executive?period=${period}`);
export const monitorLists = (period: PeriodKey) => call<MonitorLists>('GET', `/monitor?period=${period}`);

/* ---------- quick view (modal) ---------- */

export type DetailItem = {
  seq: number;
  description: string;
  pieces: number;
  saleUnit: string;
  saleQuantity: string;
  unitPrice: string | null;
  net: string;
  weightKg: string | null;
  notes: string | null;
  services: { name: string; value: string; included: boolean }[];
};

type DetailBase = {
  id: number;
  number: string;
  status: string;
  client: string;
  clientCity: string | null;
  seller: string;
  paymentCondition: string | null;
  deliveryType: 'retirada' | 'entrega';
  deliveryTerm: string | null;
  deliveryDate: string | null;
  notes: string | null;
  items: DetailItem[];
};

export type QuoteDetail = DetailBase & {
  issueDate: string | null;
  validUntil: string | null;
  buyerName: string | null;
  order: { id: number; number: string } | null;
  totals: { materials: string; services: string; discount: string; freight: string; extras: string; total: string; weightKg: string | null };
};

export type SaleDetail = DetailBase & {
  date: string | null;
  paymentStatus: 'pendente' | 'confirmado' | null;
  document: string | null;
  production: { status: string | null; sentAt: string | null; readyAt: string | null; deliveredAt: string | null; late: boolean };
  quotation: { id: number; number: string } | null;
  totals: { discount: string; freight: string; extras: string; total: string; weightKg: string | null };
  receivables: {
    id: number;
    installment: number;
    installments: number;
    amount: string;
    paid: string;
    dueDate: string | null;
    status: 'aberto' | 'parcial' | 'recebido';
    settledOn: string | null;
    overdue: boolean;
  }[] | null;
};

export const quoteDetail = (id: number) => call<QuoteDetail>('GET', `/monitor/quotes/${id}`);
export const saleDetail = (id: number) => call<SaleDetail>('GET', `/monitor/sales/${id}`);
export const quoteProposal = (id: number) => call<unknown>('GET', `/monitor/quotes/${id}/proposal`);
