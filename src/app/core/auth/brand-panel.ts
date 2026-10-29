import { Component } from '@angular/core';

interface Span {
  /** Hora de início, 0 a 24. */
  start: number;
  end: number;
  /** Hora extra aprovada, depois do fim da jornada. */
  extra?: boolean;
}

const WORKDAY: Span[] = [
  { start: 8, end: 12 },
  { start: 13, end: 17 },
];

/**
 * Painel da marca na tela de entrada (só no desktop). Sem imagem: a ilustração é a linha do
 * tempo do produto, em CSS, com laranja onde a estação libera e hachura onde bloqueia.
 * A semana desenhada é decorativa; o texto ao lado diz o que ela mostra.
 */
@Component({
  selector: 'app-brand-panel',
  templateUrl: './brand-panel.html',
  styleUrl: './brand-panel.scss',
})
export class BrandPanel {
  protected readonly week = [
    { day: 'Seg', spans: WORKDAY },
    { day: 'Ter', spans: WORKDAY },
    { day: 'Qua', spans: WORKDAY },
    { day: 'Qui', spans: [...WORKDAY, { start: 17, end: 19, extra: true }] },
    { day: 'Sex', spans: WORKDAY },
  ];

  protected percent(hours: number): number {
    return (hours / 24) * 100;
  }
}
