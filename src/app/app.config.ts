import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, TitleStrategy } from '@angular/router';
import { mockApiInterceptor } from './core/mock-api/mock-api.interceptor';
import { PageTitleStrategy } from './core/page-title-strategy';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // Sem backend na prova de conceito: o interceptor responde a /api/... (ADR 0005).
    provideHttpClient(withInterceptors([mockApiInterceptor])),
    { provide: TitleStrategy, useClass: PageTitleStrategy },
  ],
};
