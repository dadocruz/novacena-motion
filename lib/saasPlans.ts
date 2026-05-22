export type BillingCycle = 'monthly' | 'annual' | 'triennial';

export type SaasPlan = {
  id: 'starter' | 'pro' | 'studio';
  name: string;
  description: string;
  monthlyPriceBRL: number;
  includedTokens: number;
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
  { id: 'annual', label: 'Anual', multiplier: 10, discountLabel: '2 meses grátis' },
  { id: 'triennial', label: 'Trienal', multiplier: 24, discountLabel: '12 meses grátis' },
];

export const SAAS_PLANS: SaasPlan[] = [
  {
    id: 'starter',
    name: 'Start',
    description: 'Para artistas e equipes que exportam campanhas pontuais.',
    monthlyPriceBRL: 97,
    includedTokens: 30,
    maxVideoSeconds: 20,
    features: ['30 renders por ciclo', 'Templates essenciais', 'Exportação em story e feed'],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Para lançamentos recorrentes e social media musical.',
    monthlyPriceBRL: 197,
    includedTokens: 100,
    maxVideoSeconds: 40,
    features: ['100 renders por ciclo', 'Todos os templates', 'Galeria de projetos', 'Uploads pesados'],
  },
  {
    id: 'studio',
    name: 'Studio',
    description: 'Para produtoras, agências e alto volume de lançamentos.',
    monthlyPriceBRL: 497,
    includedTokens: 350,
    maxVideoSeconds: 60,
    features: ['350 renders por ciclo', 'Prioridade na fila', 'Biblioteca avançada', 'Suporte de implantação'],
  },
];

export function planPrice(plan: SaasPlan, cycle: BillingCycle) {
  const selectedCycle = BILLING_CYCLES.find((item) => item.id === cycle) ?? BILLING_CYCLES[0];
  return plan.monthlyPriceBRL * selectedCycle.multiplier;
}

export function checkoutEnvName(planId: string, cycle: BillingCycle) {
  return `NOVACENA_CHECKOUT_${planId.toUpperCase()}_${cycle.toUpperCase()}`;
}
