import { usePageTitle } from '../../hooks/usePageTitle';
import { useAuthStore } from '../../stores/auth.store';
import { MotoristaView } from './MotoristaView';
import { PainelKPIs } from './PainelKPIs';
import { GraficoCombustivel } from './GraficoCombustivel';
import { ItensCriticos } from './ItensCriticos';
import { GraficoFrotaManutencao } from './GraficoFrotaManutencao';
import { PainelAlertas } from './PainelAlertas';
import { OsRecentes } from './OsRecentes';
import { ResumoCombustivel } from './ResumoCombustivel';
import { ProximosEventos } from './ProximosEventos';

export function DashboardPage() {
  usePageTitle('Dashboard');
  const { user } = useAuthStore();

  if (user?.role === 'motorista' && user.funcionarioId) {
    return <MotoristaView funcionarioId={user.funcionarioId} />;
  }

  return (
    <div className="space-y-6">
      <PainelKPIs />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <GraficoCombustivel />
        </div>
        <ItensCriticos />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <GraficoFrotaManutencao />
        </div>
        <PainelAlertas />
      </div>

      <OsRecentes />
      <ResumoCombustivel />
      <ProximosEventos />
    </div>
  );
}
