import { supabase } from '@/integrations/supabase/client';
import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Edit2, ExternalLink, PlayCircle } from 'lucide-react';
import { ajudaApi } from '@/features/ajuda/api';
import { useHelpTutorial, useHelpTutorials, useHelpViews, useRecordView } from './hooks/useHelpTutorials';
import { useOrganization } from '@/hooks/useOrganization';
import { Button } from '@/components/ui/button';
import { TutorialCard } from './components/TutorialCard';
import { getCategoryMeta, toEmbedUrl, formatDuration } from './constants';

const sb = supabase as any;

export default function AjudaWatchPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: tutorial, isLoading } = useHelpTutorial(id);
  const { data: all = [] } = useHelpTutorials();
  const { data: views = [] } = useHelpViews();
  const recordView = useRecordView();
  const { userRole } = useOrganization();
  const canManage = userRole === 'admin' || userRole === 'coordenador';
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  // Record view on mount
  useEffect(() => {
    if (id) recordView.mutate({ id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Generate signed URL for uploaded files
  useEffect(() => {
    if (!tutorial?.storage_path) return;
    sb.storage.from('help-content').createSignedUrl(tutorial.storage_path, 3600).then(({ data }: any) => {
      if (data?.signedUrl) setFileUrl(data.signedUrl);
    });
  }, [tutorial?.storage_path]);

  const watchedIds = useMemo(() => new Set(views.filter((v) => v.completed).map((v) => v.tutorial_id)), [views]);
  const inProgressIds = useMemo(() => new Set(views.filter((v) => !v.completed && v.progress_seconds > 5).map((v) => v.tutorial_id)), [views]);

  const related = useMemo(() => {
    if (!tutorial) return [];
    return all
      .filter((t) => t.id !== tutorial.id && (t.category === tutorial.category || t.feature_name === tutorial.feature_name))
      .slice(0, 6);
  }, [all, tutorial]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!tutorial) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Tutorial não encontrado ou sem permissão.</p>
        <Button onClick={() => navigate('/ajuda')}><ArrowLeft className="h-4 w-4 mr-1.5" /> Voltar para a Central</Button>
      </div>
    );
  }

  const meta = getCategoryMeta(tutorial.category);

  return (
    <div className="-mx-4 -my-6 lg:-mx-8 bg-[#0F121C] text-white min-h-[calc(100vh-4rem)]">
      {/* Topbar */}
      <div className="sticky top-0 z-20 backdrop-blur-md bg-[#0F121C]/90 border-b border-white/5">
        <div className="px-4 sm:px-8 py-3 flex items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white">
            <Link to="/ajuda"><ArrowLeft className="h-4 w-4 mr-1.5" /> Central de Ajuda</Link>
          </Button>
          <div className="flex items-center gap-2">
            {canManage && (
              <Button asChild size="sm" variant="outline" className="bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white">
                <Link to={`/ajuda/${tutorial.id}/editar`}><Edit2 className="h-3.5 w-3.5 mr-1.5" /> Editar</Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-8 py-8 max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 text-xs text-white/60 mb-2">
            <meta.icon className="h-3.5 w-3.5" />
            <span className="uppercase tracking-wider">{meta.label}</span>
            <span>•</span>
            <span>{tutorial.feature_name}</span>
            {tutorial.duration_seconds ? <><span>•</span><span>{formatDuration(tutorial.duration_seconds)}</span></> : null}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight">{tutorial.title}</h1>
          {tutorial.description && (
            <p className="mt-3 text-white/70 max-w-3xl">{tutorial.description}</p>
          )}
        </div>

        {/* Player */}
        <div className="rounded-2xl overflow-hidden border border-white/5 bg-black shadow-2xl">
          <ContentViewer tutorial={tutorial} fileUrl={fileUrl} onComplete={() => id && recordView.mutate({ id, completed: true })} />
        </div>

        {/* Mark as watched manually */}
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => id && recordView.mutate({ id, completed: true })}
            className="bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white"
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" /> Marcar como concluído
          </Button>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="space-y-4 pt-4">
            <h2 className="text-xl font-bold">Tutoriais relacionados</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {related.map((t) => (
                <TutorialCard key={t.id} tutorial={t} watched={watchedIds.has(t.id)} inProgress={inProgressIds.has(t.id)} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function ContentViewer({ tutorial, fileUrl, onComplete }: { tutorial: any; fileUrl: string | null; onComplete: () => void }) {
  if (tutorial.content_type === 'video_link') {
    const embed = toEmbedUrl(tutorial.content_url);
    return (
      <div className="aspect-video">
        {embed ? (
          <iframe
            src={embed}
            title={tutorial.title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="flex items-center justify-center h-full text-white/50">URL inválida</div>
        )}
      </div>
    );
  }

  if (tutorial.content_type === 'video_upload' && fileUrl) {
    return (
      <video src={fileUrl} controls className="w-full aspect-video" onEnded={onComplete}>
        Seu navegador não suporta vídeo.
      </video>
    );
  }

  if (tutorial.content_type === 'pdf' && fileUrl) {
    return <iframe src={fileUrl} title={tutorial.title} className="w-full h-[80vh] bg-white" />;
  }

  if (tutorial.content_type === 'image' && fileUrl) {
    return (
      <div className="bg-black flex items-center justify-center p-4">
        <img src={fileUrl} alt={tutorial.title} className="max-h-[80vh] object-contain" />
      </div>
    );
  }

  if (tutorial.content_type === 'link') {
    return (
      <div className="aspect-video flex flex-col items-center justify-center gap-4 p-8 text-center">
        <PlayCircle className="h-16 w-16 text-[#FFDA45]" />
        <p className="text-white/70">Este tutorial está hospedado em um site externo.</p>
        <a
          href={tutorial.content_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-[#FFDA45] text-[#1B1E2C] px-6 py-3 font-bold hover:bg-[#FFDA45]/90"
        >
          <ExternalLink className="h-4 w-4" /> Abrir tutorial
        </a>
      </div>
    );
  }

  return (
    <div className="aspect-video flex items-center justify-center text-white/50">
      <div className="animate-spin h-8 w-8 rounded-full border-2 border-[#FFDA45] border-t-transparent" />
    </div>
  );
}
