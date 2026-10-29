import { Component, computed, input } from '@angular/core';
import { ExtensionRequestStatus, WorkstationState } from '../../shared/models/status';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

export type Status = ExtensionRequestStatus | WorkstationState;

/** Cor do badge. `unlocked` é o laranja de estação liberada; `blocked`, a hachura. */
type Tone = 'approved' | 'pending' | 'rejected' | 'neutral' | 'unlocked' | 'blocked';

interface StatusInfo {
  label: string;
  icon: IconName;
  tone: Tone;
}

export const STATUS_INFO: Record<Status, StatusInfo> = {
  // Pedido de extensão
  aguardando_gestor: { label: 'Aguardando gestor', icon: 'hourglass_top', tone: 'pending' },
  aguardando_rh: { label: 'Aguardando RH', icon: 'pending_actions', tone: 'pending' },
  aprovado: { label: 'Aprovado', icon: 'check_circle', tone: 'approved' },
  recusado: { label: 'Recusado', icon: 'cancel', tone: 'rejected' },
  expirado: { label: 'Expirado', icon: 'timer_off', tone: 'neutral' },
  cancelado: { label: 'Cancelado', icon: 'do_not_disturb_on', tone: 'neutral' },
  // Estação de trabalho
  em_jornada: { label: 'Em jornada', icon: 'lock_open', tone: 'unlocked' },
  intervalo: { label: 'Em intervalo', icon: 'coffee', tone: 'neutral' },
  he_aprovada: { label: 'Hora extra aprovada', icon: 'more_time', tone: 'approved' },
  bloqueada: { label: 'Bloqueada', icon: 'lock', tone: 'blocked' },
  fora_expediente: { label: 'Fora do expediente', icon: 'bedtime', tone: 'neutral' },
};

/** Status de pedido ou de estação, sempre com ícone e rótulo (nunca só a cor). */
@Component({
  selector: 'app-status-badge',
  imports: [Icon],
  templateUrl: './status-badge.html',
  styleUrl: './status-badge.scss',
  host: { '[attr.data-tone]': 'info().tone' },
})
export class StatusBadge {
  readonly status = input.required<Status>();

  protected readonly info = computed(() => STATUS_INFO[this.status()]);
}
