import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from '../../design-system';

/** Página simples: a PoC não troca senhas, só diz a quem pedir. */
@Component({
  imports: [Button, RouterLink],
  selector: 'app-forgot-password-page',
  templateUrl: './forgot-password-page.html',
  styleUrl: './forgot-password-page.scss',
})
export class ForgotPasswordPage {}
