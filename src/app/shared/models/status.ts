// Status do domínio (lista no CLAUDE.md). Os valores ficam em português porque são os mesmos
// da API; o rótulo de interface de cada um está no StatusBadge.

/** Status de um pedido de extensão (ExtensionRequest). */
export const EXTENSION_REQUEST_STATUSES = [
  'aguardando_gestor',
  'aguardando_rh',
  'aprovado',
  'recusado',
  'expirado',
  'cancelado',
] as const;

export type ExtensionRequestStatus = (typeof EXTENSION_REQUEST_STATUSES)[number];

/** Estado de uma estação de trabalho (Workstation). */
export const WORKSTATION_STATES = [
  'em_jornada',
  'intervalo',
  'he_aprovada',
  'bloqueada',
  'fora_expediente',
] as const;

export type WorkstationState = (typeof WORKSTATION_STATES)[number];
