import { UserSquare2 } from 'lucide-react';
import PlaceholderFinanceiroPage from '@/features/administracao/PlaceholderFinanceiroPage';
export default function ClientesPagadoresPage() {
  return (
    <PlaceholderFinanceiroPage
      title="Clientes e Pagadores"
      description="Pessoas físicas e jurídicas que efetuam pagamentos à organização."
      icon={UserSquare2}
      bullets={['Vínculo opcional com beneficiário/fornecedor existente.', 'Dados fiscais e endereço de cobrança.']}
    />
  );
}
