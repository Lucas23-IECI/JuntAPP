export type PlanId = 'juntapp' | 'juntapp_web' | 'web';

export const WHATSAPP_ADDON_PRICE_CLP = 7_990;
export const PLANS = {
  juntapp: { id: 'juntapp', name: 'JuntAPP', price: 14_990, hasApp: true, hasWebsite: false },
  juntapp_web: { id: 'juntapp_web', name: 'JuntAPP + Página', price: 22_990, hasApp: true, hasWebsite: true },
  web: { id: 'web', name: 'Solo Página', price: 9_990, hasApp: false, hasWebsite: true },
} as const satisfies Record<PlanId, { id: PlanId; name: string; price: number; hasApp: boolean; hasWebsite: boolean }>;

export function isPlanId(value: unknown): value is PlanId { return typeof value === 'string' && value in PLANS; }
export function subscriptionPrice(plan: PlanId, whatsapp: boolean) { return PLANS[plan].price + (whatsapp ? WHATSAPP_ADDON_PRICE_CLP : 0); }
export function formatCLP(value: number) { return new Intl.NumberFormat('es-CL').format(value); }
