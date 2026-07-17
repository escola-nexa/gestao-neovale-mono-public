import { useParams } from 'react-router-dom';
import { useTalentPool } from './hooks/useTalentPool';
import { TalentFormView } from './components/TalentFormView';
import { Loader2 } from 'lucide-react';

export default function TalentoFormPage() {
  const { id } = useParams<{ id?: string }>();
  const { items, loading } = useTalentPool();

  if (id && loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const candidate = id ? items.find(c => c.id === id) || null : null;

  if (id && !loading && !candidate) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Candidato não encontrado.
      </div>
    );
  }

  return <TalentFormView candidate={candidate} />;
}
