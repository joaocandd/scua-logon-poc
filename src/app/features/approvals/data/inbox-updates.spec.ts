import { arrivalMessage } from './inbox-updates';

describe('arrivalMessage', () => {
  it('um pedido: quem e até que horas', () => {
    expect(arrivalMessage([{ employeeName: 'Felipe Guimarães', requestedEnd: '18:00' }])).toBe(
      'Novo pedido de Felipe Guimarães, até 18h.',
    );
  });

  it('vários: quantos e quem', () => {
    expect(
      arrivalMessage([
        { employeeName: 'Felipe Guimarães', requestedEnd: '18:00' },
        { employeeName: 'Renan Castilho', requestedEnd: '23:30' },
        { employeeName: 'André Seixas', requestedEnd: '20:00' },
      ]),
    ).toBe('3 pedidos novos: Felipe Guimarães, Renan Castilho e André Seixas.');
  });
});
