import { useEffect, useMemo } from 'react';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Route, GraduationCap, BookOpen, Play } from 'lucide-react';
import type { LibraryContentWithRefs } from '../../types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tracks: { id: string; name: string }[];
  courses: { id: string; name: string; formative_track_id: string | null }[];
  subjects: { id: string; name: string; course_id: string }[];
  contents: LibraryContentWithRefs[];
  onPickTrack: (id: string) => void;
  onPickCourse: (id: string) => void;
  onPickSubject: (id: string) => void;
  onPickContent: (item: LibraryContentWithRefs) => void;
}

export function QuickSearchPalette({
  open, onOpenChange,
  tracks, courses, subjects, contents,
  onPickTrack, onPickCourse, onPickSubject, onPickContent,
}: Props) {
  // Atalho ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  const close = () => onOpenChange(false);

  const topContents = useMemo(() => contents.slice(0, 30), [contents]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Buscar itinerário, curso, disciplina ou aula…" />
      <CommandList>
        <CommandEmpty>Nada encontrado.</CommandEmpty>

        {tracks.length > 0 && (
          <CommandGroup heading="Itinerários">
            {tracks.map(t => (
              <CommandItem key={t.id} value={`itinerario ${t.name}`} onSelect={() => { onPickTrack(t.id); close(); }}>
                <Route className="h-4 w-4 mr-2 text-primary" />
                <span className="truncate">{t.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {courses.length > 0 && (
          <CommandGroup heading="Cursos">
            {courses.map(c => (
              <CommandItem key={c.id} value={`curso ${c.name}`} onSelect={() => { onPickCourse(c.id); close(); }}>
                <GraduationCap className="h-4 w-4 mr-2 text-primary" />
                <span className="truncate">{c.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {subjects.length > 0 && (
          <CommandGroup heading="Disciplinas">
            {subjects.map(s => (
              <CommandItem key={s.id} value={`disciplina ${s.name}`} onSelect={() => { onPickSubject(s.id); close(); }}>
                <BookOpen className="h-4 w-4 mr-2 text-primary" />
                <span className="truncate">{s.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {topContents.length > 0 && (
          <CommandGroup heading="Aulas">
            {topContents.map(item => (
              <CommandItem key={item.id} value={`aula ${item.title} ${item.subject?.name ?? ''}`} onSelect={() => { onPickContent(item); close(); }}>
                <Play className="h-4 w-4 mr-2 text-primary" />
                <div className="min-w-0">
                  <div className="truncate text-sm">{item.title}</div>
                  {item.subject?.name && (
                    <div className="truncate text-[11px] text-muted-foreground">{item.subject.name}</div>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
