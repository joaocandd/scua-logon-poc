import { Component } from '@angular/core';
import { EmptyState, PageHeader } from '../../../design-system';
import { PeopleTabs } from '../ui/people-tabs';

/** Pessoas › Grupos (/pessoas/grupos). */
@Component({
  selector: 'app-groups-page',
  imports: [EmptyState, PageHeader, PeopleTabs],
  template: `
    <app-page-header
      heading="Pessoas"
      description="Colaboradores e grupos, com a regra de jornada e a estação de cada um."
    />
    <app-people-tabs active="grupos" />
    <app-empty-state
      icon="group"
      heading="Grupos em construção"
      description="Aqui fica um cartão por grupo, com o gestor, os aprovadores e a regra de jornada."
    />
  `,
})
export class GroupsPage {}
