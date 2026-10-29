import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { type FieldTree, form, FormField, FormRoot, required } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { Button, Field, FieldControl, Icon } from '../../design-system';
import { Auth, InvalidCredentialsError } from './auth';
import { BrandPanel } from './brand-panel';

interface Credentials {
  username: string;
  password: string;
}

/** Para onde vai quem acabou de entrar. */
const HOME_URL = '/hoje';

/**
 * Tela de entrada (/entrar). O formulário usa Signal Forms; o Field e o Button do design system
 * cuidam do rótulo, do erro anunciado e do estado de carregando.
 *
 * Erros só aparecem depois da primeira tentativa de envio: quem passa pelos campos com Tab até
 * "Entrar com conta corporativa" não vê erro de campo vazio.
 */
@Component({
  selector: 'app-sign-in-page',
  imports: [BrandPanel, Button, Field, FieldControl, FormField, FormRoot, Icon, RouterLink],
  templateUrl: './sign-in-page.html',
  styleUrl: './sign-in-page.scss',
})
export class SignInPage {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly passwordInput = viewChild.required<ElementRef<HTMLInputElement>>('password');

  protected readonly credentials = form(
    signal<Credentials>({ username: '', password: '' }),
    (path) => {
      required(path.username, { message: 'Informe o usuário.' });
      required(path.password, { message: 'Informe a senha.' });
    },
    {
      submission: {
        action: async (fields) => {
          this.credentialError.set(null);
          try {
            await this.auth.signIn(fields.username().value(), fields.password().value());
          } catch (error) {
            if (!(error instanceof InvalidCredentialsError)) throw error;
            this.credentialError.set('Usuário ou senha incorretos. Confira e tente de novo.');
            // Não dá para saber qual dos dois está errado; quase sempre é a senha. Ela fica
            // selecionada para quem for digitar de novo.
            this.afterRender(() => {
              this.passwordInput().nativeElement.focus();
              this.passwordInput().nativeElement.select();
            });
            return;
          }
          await this.router.navigateByUrl(HOME_URL);
        },
        onInvalid: (fields) => {
          this.credentialError.set(null);
          this.showFieldErrors.set(true);
          const firstInvalid = [fields.username, fields.password].find((f) => f().invalid());
          this.afterRender(() => firstInvalid?.().focusBoundControl());
        },
      },
    },
  );

  protected readonly showFieldErrors = signal(false);
  protected readonly credentialError = signal<string | null>(null);
  protected readonly passwordVisible = signal(false);
  protected readonly corporateLoading = signal(false);

  protected errorOf(field: FieldTree<string>): string | null {
    return this.showFieldErrors() ? (field().errors()[0]?.message ?? null) : null;
  }

  protected async signInWithCorporateAccount(): Promise<void> {
    this.corporateLoading.set(true);
    try {
      await this.auth.signInWithCorporateAccount();
      await this.router.navigateByUrl(HOME_URL);
    } finally {
      this.corporateLoading.set(false);
    }
  }

  /** Move o foco depois que a tela mostrar o erro, para o leitor de tela já ler o campo inválido. */
  private afterRender(focus: () => void): void {
    afterNextRender(focus, { injector: this.injector });
  }
}
