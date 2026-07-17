import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { NeovaleHubCard } from '@/components/NeovaleHubCard';
import { Key, Link2, FileText, Share2 } from 'lucide-react';

export default function CompartilhamentoPage() {
  const { user } = useAuth();
  const isAdmin = user?.perfil === 'admin';

  const cards = [
    ...(isAdmin
      ? [{
          title: 'Palavras-Chave',
          description: 'Gerencie as chaves de segurança usadas para validar acessos externos aos boletins e documentos.',
          url: '/compartilhamento/keywords',
          icon: Key,
          tag: '01 / Chaves',
        }]
      : []),
    {
      title: 'Links Externos',
      description: 'Crie e administre links públicos para compartilhamento seguro de boletins com escolas e responsáveis.',
      url: '/compartilhamento/links',
      icon: Link2,
      tag: isAdmin ? '02 / Links' : '01 / Links',
    },
    {
      title: 'Logs de Acesso',
      description: 'Auditoria completa de acessos externos: quem acessou, quando, de onde e o que visualizou.',
      url: '/compartilhamento/logs',
      icon: FileText,
      tag: isAdmin ? '03 / Auditoria' : '02 / Auditoria',
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumbs={[{ label: 'Administração', href: '/administracao' }, { label: 'Compartilhamento Externo' }]}
        title="Compartilhamento Externo"
        description="Central de acesso público: palavras-chave, links e auditoria de visualizações externas."
        icon={Share2}
        variant="hero"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map((card) => (
          <NeovaleHubCard key={card.url} {...card} />
        ))}
      </div>
    </div>
  );
}
