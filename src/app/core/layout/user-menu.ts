import { Menu, MenuItem, MenuTrigger } from '@angular/aria/menu';
import { Component, inject } from '@angular/core';
import { Icon, IconName } from '../../design-system';
import { CurrentUser } from '../auth/current-user';
import { Theme, ThemePreference } from './theme';

interface ThemeOption {
  value: ThemePreference;
  label: string;
  icon: IconName;
}

/**
 * Menu do usuário no cabeçalho: quem está usando o app e a escolha do tema. Botão e menu seguem
 * o padrão ARIA de menu button pelo Angular Aria: setas percorrem as opções, Enter ou Espaço
 * escolhe, Esc fecha e o foco volta para o botão.
 */
@Component({
  selector: 'app-user-menu',
  imports: [Menu, MenuItem, MenuTrigger, Icon],
  templateUrl: './user-menu.html',
  styleUrl: './user-menu.scss',
})
export class UserMenu {
  protected readonly currentUser = inject(CurrentUser);
  protected readonly theme = inject(Theme);

  protected readonly themes: ThemeOption[] = [
    { value: 'light', label: 'Claro', icon: 'light_mode' },
    { value: 'dark', label: 'Escuro', icon: 'dark_mode' },
    { value: 'system', label: 'Do sistema', icon: 'brightness_auto' },
  ];

  protected select(value: ThemePreference | undefined): void {
    if (value) this.theme.set(value);
  }
}
