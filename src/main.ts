import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { startDemoClock } from './app/shared/clock';

// Relógio de demonstração (?relogio=2026-11-24T17:40): ligado antes de tudo, para a API simulada
// já nascer com os dados relativos ao instante escolhido.
startDemoClock(window.location.search, sessionStorageOrNull());

bootstrapApplication(App, appConfig).catch((err) => console.error(err));

/** Com o armazenamento bloqueado, até ler `window.sessionStorage` lança erro. */
function sessionStorageOrNull(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}
