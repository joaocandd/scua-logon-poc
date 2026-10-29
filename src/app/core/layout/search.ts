// Busca da paleta de comandos (Ctrl+K). Função pura: recebe o texto e as listas e devolve os
// resultados em seções. A paleta só desenha o que sai daqui.
import { IconName } from '../../design-system';
import { Employee, Group, WorkSchedule } from '../../shared/models';
import { formatRange, toMinutes } from '../../shared/time';
import { NavItem } from './nav-items';

export type SearchResultKind = 'page' | 'employee' | 'group' | 'schedule';

export interface SearchResult {
  /** Único entre todos os resultados. Vira o id da opção na lista. */
  id: string;
  kind: SearchResultKind;
  label: string;
  /** Linha de apoio, como o cargo e o grupo do colaborador. */
  detail?: string;
  icon: IconName;
  /** Para onde o resultado leva. */
  path: string;
  queryParams?: Record<string, string>;
}

export interface SearchSection {
  kind: SearchResultKind;
  heading: string;
  results: SearchResult[];
}

export interface SearchSources {
  pages: readonly NavItem[];
  employees: readonly Employee[];
  groups: readonly Group[];
  schedules: readonly WorkSchedule[];
}

/** Máximo de colaboradores, grupos ou regras por seção, para a lista caber na tela. */
export const MAX_RESULTS_PER_SECTION = 5;

/**
 * Sem texto, mostra só as páginas (atalhos). Com texto, procura em páginas, colaboradores
 * (nome, cargo e grupo), grupos e regras. Ignora acentos e maiúsculas, e cada palavra digitada
 * precisa aparecer: "ana fin" encontra "Ana ..., Analista financeira".
 */
export function search(query: string, sources: SearchSources): SearchSection[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const groupName = new Map(sources.groups.map((g) => [g.id, g.name]));

  const pages = sources.pages.map((page): SearchResult => ({
    id: `page-${page.path.slice(1)}`,
    kind: 'page',
    label: page.label,
    icon: page.icon,
    path: page.path,
  }));
  if (terms.length === 0) return [{ kind: 'page', heading: 'Páginas', results: pages }];

  const employees = sources.employees.map((employee): SearchResult => ({
    id: `employee-${employee.id}`,
    kind: 'employee',
    label: employee.name,
    detail: [employee.jobTitle, groupName.get(employee.groupId)].filter(Boolean).join(' · '),
    icon: 'person',
    path: '/pessoas',
    queryParams: { colaborador: employee.id },
  }));
  const groups = sources.groups.map((group): SearchResult => ({
    id: `group-${group.id}`,
    kind: 'group',
    label: group.name,
    detail: countLabel(sources.employees.filter((e) => e.groupId === group.id).length),
    icon: 'group',
    path: '/pessoas',
    queryParams: { grupo: group.id },
  }));
  const schedules = sources.schedules.map((schedule): SearchResult => ({
    id: `schedule-${schedule.id}`,
    kind: 'schedule',
    label: schedule.name,
    detail: capitalize(formatRange(toMinutes(schedule.start), toMinutes(schedule.end))),
    icon: 'schedule',
    path: '/regras',
    queryParams: { regra: schedule.id },
  }));

  const sections: SearchSection[] = [
    { kind: 'page', heading: 'Páginas', results: match(pages, terms) },
    { kind: 'employee', heading: 'Colaboradores', results: match(employees, terms) },
    { kind: 'group', heading: 'Grupos', results: match(groups, terms) },
    { kind: 'schedule', heading: 'Regras de jornada', results: match(schedules, terms) },
  ];
  return sections.filter((section) => section.results.length > 0);
}

/** "João" → "joao". Para comparar sem acento e sem maiúscula. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/** Quem tem todas as palavras. Nome que começa com o texto digitado vem primeiro. */
function match(results: SearchResult[], terms: string[]): SearchResult[] {
  const query = terms.join(' ');
  return results
    .filter((result) => {
      const text = normalize(`${result.label} ${result.detail ?? ''}`);
      return terms.every((term) => text.includes(term));
    })
    .sort((a, b) => startsWith(b, query) - startsWith(a, query))
    .slice(0, MAX_RESULTS_PER_SECTION);
}

function startsWith(result: SearchResult, query: string): number {
  return normalize(result.label).startsWith(query) ? 1 : 0;
}

function countLabel(count: number): string {
  return count === 1 ? '1 colaborador' : `${count} colaboradores`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
