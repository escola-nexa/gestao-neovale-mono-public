import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SubjectNameWithAnpProps {
  name: string;
  isAnp?: boolean;
  compact?: boolean;
  className?: string;
  badgeClassName?: string;
}

/**
 * Renders a subject name and, when isAnp is true, an "ANP" badge next to it.
 * Use across reports/lists where a disciplina name is shown.
 */
export function SubjectNameWithAnp({
  name,
  isAnp,
  compact,
  className,
  badgeClassName,
}: SubjectNameWithAnpProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span>{name}</span>
      {isAnp && (
        <Badge
          variant="outline"
          className={cn(
            "border-amber-300 bg-amber-100 text-amber-900 font-bold",
            compact ? "px-1 py-0 text-[9px] leading-none h-4" : "px-1.5 py-0 text-[10px] leading-tight h-5",
            badgeClassName,
          )}
        >
          ANP
        </Badge>
      )}
    </span>
  );
}

/**
 * Text helper for non-React contexts (PDFs, exports, alt text).
 */
export function formatSubjectName(name: string, isAnp?: boolean): string {
  return isAnp ? `${name} (ANP)` : name;
}
