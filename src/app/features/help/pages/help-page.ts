import { Component } from '@angular/core';
import { PageHeader } from '../../../design-system';

interface Question {
  question: string;
  answer: string;
}

/**
 * Ajuda (/ajuda): perguntas frequentes. Substitui as "Perguntas frequentes" do console atual.
 * As perguntas são as do FAQ público de scua.com.br/planos-e-precos ("Dúvidas antes de decidir");
 * as respostas são um resumo curto das de lá. Cada uma fica num <details>: abre com Enter ou
 * Espaço, sem JavaScript.
 */
@Component({
  selector: 'app-help-page',
  imports: [PageHeader],
  templateUrl: './help-page.html',
  styleUrl: './help-page.scss',
})
export class HelpPage {
  protected readonly questions: Question[] = [
    {
      question: 'O que é o Scua Logon?',
      answer:
        'É o software de gestão de jornada que controla o acesso às estações de trabalho, com segurança e de acordo com a legislação trabalhista.',
    },
    {
      question: 'Como o Scua Logon controla a jornada na prática?',
      answer:
        'Ele bloqueia e libera o computador sozinho: a estação fica bloqueada antes da jornada e nos intervalos, e bloqueia no fim do dia. Para estender a jornada, o colaborador pede ao gestor, com o motivo, e o pedido passa pela aprovação.',
    },
    {
      question: 'O Scua Logon pode seguir as regras de jornada da minha empresa?',
      answer:
        'Sim. Dá para configurar horários fixos ou flexíveis, intervalos, políticas de acesso e a integração com outros sistemas de ponto.',
    },
    {
      question: 'O sistema serve como evidência em auditoria e em processo trabalhista?',
      answer:
        'Sim. Os registros são detalhados e não podem ser alterados, e servem como prova documental em auditorias e processos.',
    },
    {
      question: 'O Scua Logon atende à LGPD?',
      answer:
        'Sim. Os registros de acesso ficam guardados com segurança e transparência, de acordo com a Lei Geral de Proteção de Dados.',
    },
  ];
}
