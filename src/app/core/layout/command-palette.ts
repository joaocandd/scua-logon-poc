import { Combobox, ComboboxPopup, ComboboxWidget } from '@angular/aria/combobox';
import { Listbox, Option } from '@angular/aria/listbox';
import { DialogRef } from '@angular/cdk/dialog';
import {
  afterRenderEffect,
  Component,
  computed,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { Button, Icon } from '../../design-system';
import { People } from '../../features/people/data/people';
import { WorkSchedules } from '../../features/schedules/data/work-schedules';
import { NAV_ITEMS } from './nav-items';
import { search } from './search';

/** Id do rótulo do campo. Também dá nome ao diálogo (ariaLabelledBy em quem abre). */
export const COMMAND_PALETTE_LABEL_ID = 'busca-rotulo';

/**
 * Paleta de comandos: um campo de busca que leva a páginas, colaboradores, grupos e regras.
 * Abre num Dialog do CDK (foco preso, foco volta para quem abriu). O campo e a lista seguem o
 * padrão ARIA de combobox com listbox, pelo Angular Aria: setas mudam a opção ativa
 * (aria-activedescendant), Enter abre e Esc fecha.
 */
@Component({
  selector: 'app-command-palette',
  imports: [Combobox, ComboboxPopup, ComboboxWidget, Listbox, Option, Button, Icon],
  templateUrl: './command-palette.html',
  styleUrl: './command-palette.scss',
})
export class CommandPalette {
  protected readonly ref = inject(DialogRef);
  private readonly router = inject(Router);
  private readonly people = inject(People);
  private readonly schedules = inject(WorkSchedules);

  protected readonly labelId = COMMAND_PALETTE_LABEL_ID;
  protected readonly query = signal('');
  private readonly listbox = viewChild(Listbox);

  private readonly sources = [this.people.employees, this.people.groups, this.schedules.list];

  protected readonly sections = computed(() =>
    search(this.query(), {
      pages: NAV_ITEMS,
      employees: this.people.employees.hasValue() ? this.people.employees.value() : [],
      groups: this.people.groups.hasValue() ? this.people.groups.value() : [],
      schedules: this.schedules.list.hasValue() ? this.schedules.list.value() : [],
    }),
  );
  private readonly results = computed(() => this.sections().flatMap((s) => s.results));

  protected readonly loading = computed(() => this.sources.some((s) => s.isLoading()));
  protected readonly failed = computed(() => this.sources.some((s) => s.error()));

  /** Texto para o leitor de tela, atualizado a cada busca. */
  protected readonly status = computed(() => {
    const query = this.query().trim();
    const count = this.results().length;
    if (!query) return '';
    if (this.loading() && count === 0) return 'Buscando…';
    if (count === 0) return `Nada encontrado para “${query}”.`;
    return count === 1 ? '1 resultado' : `${count} resultados`;
  });

  constructor() {
    // Cada busca nova começa no primeiro resultado, então Enter abre o mais provável. Sem opção
    // ativa, a primeira também vira a ativa: acontece quando a pessoa digita antes de os
    // colaboradores e as regras chegarem da API, e a lista só se enche depois.
    let lastQuery: string | undefined;
    afterRenderEffect(() => {
      const query = this.query();
      this.results();
      const listbox = this.listbox();
      if (!listbox) return;
      if (query !== lastQuery || !listbox.activeDescendant()) untracked(() => listbox.gotoFirst());
      lastQuery = query;
    });
    // A opção ativa sempre visível dentro da lista com rolagem.
    afterRenderEffect(() => {
      const listbox = this.listbox();
      if (listbox?.activeDescendant()) listbox.scrollActiveItemIntoView();
    });
  }

  protected retry(): void {
    for (const source of this.sources) if (source.error()) source.reload();
  }

  /** Abre a opção ativa. Num clique, o Listbox já tornou ativa a opção clicada. */
  protected open(event?: Event): void {
    if (event && !(event.target as Element).closest('[role="option"]')) return;
    const active = this.listbox()?.activeDescendant();
    const result = this.results().find((r) => r.id === active);
    if (!result) return;
    this.ref.close();
    void this.router.navigate([result.path], { queryParams: result.queryParams });
  }
}
