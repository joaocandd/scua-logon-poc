import {
  demoClock,
  DEMO_CLOCK_STORAGE_KEY,
  now,
  nowDate,
  parseDemoClock,
  startDemoClock,
  stopDemoClock,
} from './clock';

/** sessionStorage em memória, para o teste não depender do jsdom. */
function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  };
}

const TUESDAY = Date.parse('2026-11-24T17:40:00-03:00');
const REAL = Date.parse('2026-11-21T15:00:00-03:00'); // sábado da demo

describe('relógio de demonstração', () => {
  afterEach(() => stopDemoClock(null));

  it('lê o horário de São Paulo e recusa o que não é data e hora', () => {
    expect(parseDemoClock('2026-11-24T17:40')).toBe(TUESDAY);
    expect(parseDemoClock('2026-11-31T10:00')).toBeNull();
    expect(parseDemoClock('2026-11-24T25:00')).toBeNull();
    expect(parseDemoClock('amanhã')).toBeNull();
    expect(parseDemoClock(null)).toBeNull();
  });

  it('sem o parâmetro, nada muda: o relógio é o do computador', () => {
    startDemoClock('?simular=vazio', memoryStorage(), REAL);
    expect(demoClock()).toBeNull();
    expect(Math.abs(now() - Date.now())).toBeLessThan(50);
  });

  it('com ?relogio=, o app vive no instante escolhido e o tempo anda dali', () => {
    vi.useFakeTimers({ now: REAL });
    try {
      startDemoClock('?relogio=2026-11-24T17:40', memoryStorage(), REAL);
      expect(now()).toBe(TUESDAY);
      vi.advanceTimersByTime(5 * 60_000);
      expect(now()).toBe(TUESDAY + 5 * 60_000);
      expect(nowDate().toISOString()).toBe('2026-11-24T20:45:00.000Z');
    } finally {
      vi.useRealTimers();
    }
  });

  it('fica na sessão: outra tela, sem o parâmetro, continua no mesmo relógio', () => {
    const storage = memoryStorage();
    startDemoClock('?relogio=2026-11-24T17:40', storage, REAL);
    expect(storage.getItem(DEMO_CLOCK_STORAGE_KEY)).not.toBeNull();

    // Recarregar (com ou sem o parâmetro igual) não reinicia a contagem.
    startDemoClock('', storage, REAL + 60_000);
    expect(demoClock()).toEqual({ value: '2026-11-24T17:40', start: TUESDAY, activatedAt: REAL });
    startDemoClock('?relogio=2026-11-24T17:40', storage, REAL + 60_000);
    expect(demoClock()?.activatedAt).toBe(REAL);

    // Outro valor recomeça dali.
    startDemoClock('?relogio=2026-11-25T09:00', storage, REAL + 60_000);
    expect(demoClock()?.value).toBe('2026-11-25T09:00');
  });

  it('valor inválido não liga o relógio', () => {
    startDemoClock('?relogio=ontem', memoryStorage(), REAL);
    expect(demoClock()).toBeNull();
  });

  it('"Desligar" volta ao relógio do computador e esquece a sessão', () => {
    const storage = memoryStorage();
    startDemoClock('?relogio=2026-11-24T17:40', storage, REAL);
    stopDemoClock(storage);
    expect(demoClock()).toBeNull();
    expect(storage.getItem(DEMO_CLOCK_STORAGE_KEY)).toBeNull();
    expect(Math.abs(now() - Date.now())).toBeLessThan(50);
  });
});
