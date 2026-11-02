import { httpResource } from '@angular/common/http';
import { ActivityEvent } from '../../../shared/models';

/**
 * Histórico de um pedido (/api/historico?pedido=ped-02), do mais novo para o mais antigo. Crie
 * num campo do componente (contexto de injeção). Sem id, não busca nada.
 */
export function requestHistory(id: () => string | null) {
  return httpResource<ActivityEvent[]>(
    () => {
      const pedido = id();
      return pedido ? { url: '/api/historico', params: { pedido } } : undefined;
    },
    { defaultValue: [] },
  );
}
