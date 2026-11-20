import { Component, computed, DOCUMENT, inject } from '@angular/core';
import { demoClock, DEMO_CLOCK_PARAM, stopDemoClock } from '../../shared/clock';
import { toLocal, weekdayOf } from '../../shared/date';
import { injectNow } from '../../shared/now';
import { formatClock } from '../../shared/time';

const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/** "terça, 24/11, 17h40". */
export function demoClockLabel(instant: number): string {
  const { date, minutes } = toLocal(instant);
  const [, month, day] = date.split('-');
  return `${WEEKDAYS[weekdayOf(date)]}, ${day}/${month}, ${formatClock(minutes)}`;
}

/**
 * Faixa no topo de todas as telas enquanto o relógio de demonstração está ligado: diz em que dia e
 * hora o app acha que está e oferece "Desligar". Desligar volta ao relógio do computador e recarrega
 * a página sem o `?relogio=`, para os dados simulados voltarem a valer para agora.
 */
@Component({
  selector: 'app-demo-clock-banner',
  template: `
    @if (clock(); as state) {
      <section class="banner" aria-label="Relógio de demonstração">
        <p class="text">
          Relógio de demonstração: <strong>{{ label() }}</strong>
        </p>
        <span class="separator" aria-hidden="true">·</span>
        <button type="button" class="off" (click)="turnOff()">Desligar</button>
      </section>
    }
  `,
  styleUrl: './demo-clock-banner.scss',
})
export class DemoClockBanner {
  private readonly document = inject(DOCUMENT);
  /** O relógio anda: a faixa mostra a hora de agora, atualizada a cada 30 s. */
  private readonly now = injectNow(30_000);

  protected readonly clock = demoClock;
  protected readonly label = computed(() => demoClockLabel(this.now()));

  protected turnOff(): void {
    const view = this.document.defaultView;
    stopDemoClock(sessionStorageOf(view));
    if (!view) return;
    const url = new URL(view.location.href);
    url.searchParams.delete(DEMO_CLOCK_PARAM);
    view.location.replace(url.toString());
  }
}

/** Com o armazenamento bloqueado, até ler `sessionStorage` lança erro. */
function sessionStorageOf(view: Window | null): Storage | null {
  try {
    return view?.sessionStorage ?? null;
  } catch {
    return null;
  }
}
