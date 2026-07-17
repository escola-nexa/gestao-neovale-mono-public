interface Props {
  typing: { user_id: string; full_name: string }[];
}

export function TypingIndicator({ typing }: Props) {
  if (typing.length === 0) return null;
  const names = typing.slice(0, 3).map(t => t.full_name.split(' ')[0]);
  let text: string;
  if (typing.length === 1) text = `${names[0]} está digitando…`;
  else if (typing.length === 2) text = `${names[0]} e ${names[1]} estão digitando…`;
  else text = `${names.join(', ')} e mais ${typing.length - names.length > 0 ? typing.length - names.length : 'outros'} estão digitando…`;

  return (
    <div className="px-4 py-1 text-[11px] text-muted-foreground italic flex items-center gap-1.5">
      <span className="inline-flex gap-0.5">
        <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </span>
      {text}
    </div>
  );
}
