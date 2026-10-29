import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
// Direto do arquivo, não do índice do design system: ver o comentário em design-system/index.ts.
import { Button } from '../../design-system/button/button';

/** Página simples: a PoC não troca senhas, só diz a quem pedir. */
@Component({
  imports: [Button, RouterLink],
  selector: 'app-forgot-password-page',
  templateUrl: './forgot-password-page.html',
  styleUrl: './forgot-password-page.scss',
})
export class ForgotPasswordPage {}
