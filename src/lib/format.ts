export const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

export const kwh = (n: number) => `${(n || 0).toFixed(1)} kWh`;
