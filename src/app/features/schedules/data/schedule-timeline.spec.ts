import { newScheduleDraft, ScheduleDraft } from './schedule-draft';
import { draftTimeline } from './schedule-timeline';
import { checkHours } from './schedule-validation';

const timeline = (hours: Partial<ScheduleDraft>) =>
  draftTimeline(checkHours({ ...newScheduleDraft(), ...hours }));

describe('draftTimeline', () => {
  it('jornada liberada e almoço bloqueado, com a duração em texto', () => {
    expect(timeline({})).toEqual({
      segments: [
        { start: '08:00', end: '17:00', kind: 'unlocked', label: 'Jornada' },
        { start: '12:00', end: '13:00', kind: 'locked', label: 'Almoço' },
      ],
      duration: '9h de jornada, 1h de intervalo, 8h de trabalho',
    });
  });

  it('jornada que atravessa a meia-noite volta ao relógio', () => {
    const night = timeline({
      start: '22:00',
      end: '06:00',
      overnight: true,
      breaks: [{ label: 'Pausa', start: '02:00', end: '03:00' }],
    });
    expect(night?.segments).toEqual([
      { start: '22:00', end: '06:00', kind: 'unlocked', label: 'Jornada' },
      { start: '02:00', end: '03:00', kind: 'locked', label: 'Pausa' },
    ]);
  });

  it('sem intervalo', () => {
    expect(timeline({ end: '12:00', breaks: [] })?.duration).toBe('4h de jornada, sem intervalo');
  });

  it('não desenha o intervalo com problema', () => {
    const segments = timeline({
      breaks: [{ label: 'Almoço', start: '07:00', end: '08:00' }],
    })?.segments;
    expect(segments).toEqual([
      { start: '08:00', end: '17:00', kind: 'unlocked', label: 'Jornada' },
    ]);
  });

  it('não desenha nada enquanto a jornada não tem início e fim certos', () => {
    expect(timeline({ end: '' })).toBeNull();
    expect(timeline({ end: '07:00' })).toBeNull();
  });
});
