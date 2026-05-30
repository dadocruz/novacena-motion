export type BillingCycle = 'monthly' | 'quarterly' | 'annual';

export type SaasPlan = {
  id: 'starter' | 'pro' | 'studio';
  name: string;
  description: string;
  monthlyPriceBRL: number;
  includedTokens: number;
  monitorArtistLimit: number;
  monitorDailyRefreshLimit: number;
  maxVideoSeconds: number;
  features: string[];
};

export const BILLING_CYCLES: Array<{
  id: BillingCycle;
  label: string;
  multiplier: number;
  discountLabel: string;
}> = [
  { id: 'monthly', label: 'Mensal', multiplier: 1, discountLabel: '' },
  { id: 'quarterly', label: 'Trimestral', multiplier: 3, discountLabel: '1 mês grátis' },
  { id: 'annual', label: 'Anual', multiplier: 10, discountLabel: '2 meses grátis' },
];

export const SAAS_PLANS: SaasPlan[] = [
  {
    id: 'starter',
    name: 'Start',
    description: 'Para artistas e equipes que exportam campanhas pontuais.',
    monthlyPriceBRL: 97,
    includedTokens: 30,
    monitorArtistLimit: 10,
    monitorDailyRefreshLimit: 10,
    maxVideoSeconds: 20,
    features: ['30 renders por ciclo', 'Até 10 artistas monitorados', 'Atualização dos dados a cada 24h', 'Templates essenciais', 'Exportação em story e feed'],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Para lançamentos recorrentes e social media musical.',
    monthlyPriceBRL: 197,
    includedTokens: 100,
    monitorArtistLimit: 35,
    monitorDailyRefreshLimit: 35,
    maxVideoSeconds: 40,
    features: ['100 renders por ciclo', 'Até 35 artistas monitorados', 'Atualização dos dados a cada 24h', 'Todos os templates', 'Galeria de projetos', 'Uploads pesados'],
  },
  {
    id: 'studio',
    name: 'Studio',
    description: 'Para produtoras, agências e alto volume de lançamentos.',
    monthlyPriceBRL: 497,
    includedTokens: 350,
    monitorArtistLimit: 100,
    monitorDailyRefreshLimit: 100,
    maxVideoSeconds: 60,
    features: ['350 renders por ciclo', 'Até 100 artistas monitorados', 'Atualização dos dados a cada 24h', 'Prioridade na fila', 'Biblioteca avançada', 'Suporte de implantação'],
  },
];

export function getPlanById(planId?: string | null) {
  return SAAS_PLANS.find((plan) => plan.id === planId) ?? SAAS_PLANS[0];
}

export function planPrice(plan: SaasPlan, cycle: BillingCycle) {
  const selectedCycle = BILLING_CYCLES.find((item) => item.id === cycle) ?? BILLING_CYCLES[0];
  return plan.monthlyPriceBRL * selectedCycle.multiplier;
}

export function checkoutEnvName(planId: string, cycle: BillingCycle) {
  return `NOVACENA_CHECKOUT_${planId.toUpperCase()}_${cycle.toUpperCase()}`;
}
