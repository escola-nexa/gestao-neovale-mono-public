import { Fragment } from 'react';
import { cn } from '@/lib/utils';

const MENTION_RE = /@\[([^\]]+)\]\(([0-9a-fA-F-]{36})\)/g;

export function extractMentionedUserIds(body: string | null | undefined): string[] {
  if (!body) return [];
  const ids = new Set<string>();
  for (const m of body.matchAll(MENTION_RE)) ids.add(m[2]);
  return Array.from(ids);
}

export function stripMentionMarkup(body: string | null | undefined): string {
  if (!body) return '';
  return body.replace(MENTION_RE, (_, name) => `@${name}`);
}

interface RenderMentionsProps {
  body: string;
  currentUserId?: string | null;
}

const URL_RE = /(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])|(\bwww\.[^\s<>()]+[^\s<>().,;:!?'"])/gi;

function renderTextWithLinks(text: string, startKey: number): { nodes: React.ReactNode[]; nextKey: number } {
  const nodes: React.ReactNode[] = [];
  let key = startKey;
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) nodes.push(<Fragment key={key++}>{text.slice(last, idx)}</Fragment>);
    const raw = m[0];
    const href = raw.startsWith('http') ? raw : `https://${raw}`;
    nodes.push(
      <a
        key={key++}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 hover:text-primary/80 break-all [overflow-wrap:anywhere]"
        onClick={(e) => e.stopPropagation()}
      >
        {raw}
      </a>
    );
    last = idx + raw.length;
  }
  if (last < text.length) nodes.push(<Fragment key={key++}>{text.slice(last)}</Fragment>);
  return { nodes, nextKey: key };
}

export function RenderMessageBody({ body, currentUserId }: RenderMentionsProps) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  const pushText = (t: string) => {
    if (!t) return;
    const { nodes, nextKey } = renderTextWithLinks(t, key);
    parts.push(...nodes);
    key = nextKey;
  };
  for (const match of body.matchAll(MENTION_RE)) {
    const start = match.index ?? 0;
    if (start > lastIndex) pushText(body.slice(lastIndex, start));
    const name = match[1];
    const userId = match[2];
    const isMe = currentUserId && userId === currentUserId;
    parts.push(
      <span
        key={key++}
        className={cn(
          'inline break-words [overflow-wrap:anywhere] px-1 rounded font-semibold text-[0.95em]',
          isMe
            ? 'bg-primary/30 text-foreground ring-1 ring-primary/40'
            : 'bg-primary/15 text-primary'
        )}
      >
        @{name}
      </span>
    );
    lastIndex = start + match[0].length;
  }
  if (lastIndex < body.length) pushText(body.slice(lastIndex));
  return <>{parts}</>;
}

export function isCurrentUserMentioned(body: string | null | undefined, userId: string | null | undefined): boolean {
  if (!body || !userId) return false;
  return extractMentionedUserIds(body).includes(userId);
}
