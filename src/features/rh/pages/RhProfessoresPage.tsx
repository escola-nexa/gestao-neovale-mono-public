import { Users } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { ProfessoresTab } from './tabs/ProfessoresTab';

export default function RhProfessoresPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'R.H.', href: '/rh' }, { label: 'Carga dos Professores' }]}
        title="Carga dos Professores"
        description="Utilização semanal por professor, alertas de sobrecarga e ociosidade."
        icon={Users}
        backTo="/rh"
      />
      <ProfessoresTab />
    </div>
  );
}
