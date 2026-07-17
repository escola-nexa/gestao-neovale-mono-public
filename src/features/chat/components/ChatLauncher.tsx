import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MessageCircle, X, Minus, Maximize2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useChatUnread } from '../hooks/useChatUnread';
import { useLastChannel } from '../hooks/useLastChannel';
import { ChatPopupBody } from './ChatPopupBody';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'neovale.chatLauncher';
const POS_KEY = 'neovale.chatLauncher.pos';
const BTN_SIZE = 56; // 14 * 4
const MARGIN = 8;

interface PersistedState {
  open: boolean;
  channelId: string | null;
}

interface Position { x: number; y: number } // offset from default bottom-right (positive = move left/up)

function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { open: false, channelId: null };
    const parsed = JSON.parse(raw);
    return { open: !!parsed.open, channelId: parsed.channelId ?? null };
  } catch {
    return { open: false, channelId: null };
  }
}

function loadPos(): Position {
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (!raw) return { x: 0, y: 0 };
    const p = JSON.parse(raw);
    return { x: Number(p.x) || 0, y: Number(p.y) || 0 };
  } catch {
    return { x: 0, y: 0 };
  }
}

export function ChatLauncher() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const unread = useChatUnread();
  const { lastChannelId } = useLastChannel();
  const [state, setState] = useState<PersistedState>(() => loadState());
  const [pos, setPos] = useState<Position>(() => loadPos());
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number; moved: boolean; pointerId: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [state]);

  useEffect(() => {
    try { localStorage.setItem(POS_KEY, JSON.stringify(pos)); } catch { /* ignore */ }
  }, [pos]);

  // Mantém o botão visível ao redimensionar a janela
  useEffect(() => {
    const clamp = () => {
      setPos(p => {
        const maxX = Math.max(0, window.innerWidth - BTN_SIZE - MARGIN - 20);
        const maxY = Math.max(0, window.innerHeight - BTN_SIZE - MARGIN - 20);
        return { x: Math.min(Math.max(p.x, 0), maxX), y: Math.min(Math.max(p.y, 0), maxY) };
      });
    };
    window.addEventListener('resize', clamp);
    return () => window.removeEventListener('resize', clamp);
  }, []);

  // ESC fecha
  useEffect(() => {
    if (!state.open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setState(s => ({ ...s, open: false })); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.open]);

  // Esconde na própria página /chat (evita duplicar) e quando não logado
  if (!user) return null;
  if (location.pathname.startsWith('/chat')) return null;
  // Esconde em rotas externas/públicas
  if (
    location.pathname.startsWith('/indicacao-escola') ||
    location.pathname.startsWith('/instalar') ||
    location.pathname.startsWith('/login') ||
    location.pathname.startsWith('/auth')
  ) return null;

  const setOpen = (open: boolean) => setState(s => ({ ...s, open }));
  const setChannelId = (channelId: string | null) => setState(s => ({ ...s, channelId }));

  const openFullScreen = () => {
    setOpen(false);
    const target = state.channelId || lastChannelId;
    navigate(target ? `/chat/${target}` : '/chat');
  };

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
      moved: false,
      pointerId: e.pointerId,
    };
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* ignore */ }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) < 5) return;
    if (!d.moved) { d.moved = true; setDragging(true); }
    const maxX = Math.max(0, window.innerWidth - BTN_SIZE - MARGIN - 20);
    const maxY = Math.max(0, window.innerHeight - BTN_SIZE - MARGIN - 20);
    const nx = Math.min(Math.max(d.origX - dx, 0), maxX);
    const ny = Math.min(Math.max(d.origY - dy, 0), maxY);
    setPos({ x: nx, y: ny });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const moved = d.moved;
    dragRef.current = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    setDragging(false);
    if (!moved) setOpen(!state.open);
  };

  const popupOffset = (() => {
    const popupW = 440;
    const popupH = 640;
    const btnRight = 20 + pos.x;
    const btnBottom = 20 + pos.y;
    let right = btnRight;
    let bottom = btnBottom + BTN_SIZE + 12;
    if (bottom + popupH > window.innerHeight - 8) {
      bottom = Math.max(8, window.innerHeight - btnBottom - popupH + BTN_SIZE / 2);
    }
    if (right + popupW > window.innerWidth - 8) {
      right = Math.max(8, window.innerWidth - popupW - 8);
    }
    return { right, bottom };
  })();

  return (
    <>
      {/* Bolinha flutuante (arrastável) */}
      <button
        type="button"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-label={state.open ? 'Fechar chat' : 'Abrir chat'}
        title="Arraste para mover · Clique para abrir"
        className={cn(
          "fixed z-[60] h-14 w-14 rounded-full shadow-2xl",
          "hidden sm:flex items-center justify-center",
          "hover:scale-105 active:scale-95",
          "focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/50",
          "ring-2 ring-primary/40 touch-none select-none",
          dragging ? "cursor-grabbing scale-105" : "cursor-grab transition-all duration-200",
          state.open && !dragging && "scale-95",
        )}
        style={{ backgroundColor: '#1B1E2C', right: 20 + pos.x, bottom: 20 + pos.y }}
      >
        <MessageCircle className="h-6 w-6 text-primary pointer-events-none" strokeWidth={2.2} />
        {unread > 0 && !state.open && (
          <span
            className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center shadow-md ring-2 ring-background pointer-events-none"
            style={{ backgroundColor: '#FFDA45', color: '#1B1E2C' }}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Popup */}
      {state.open && (
        <div
          role="dialog"
          aria-label="Chat Institucional"
          className={cn(
            "fixed z-[61] w-[440px] max-w-[calc(100vw-2.5rem)] h-[640px] max-h-[calc(100vh-8rem)]",
            "hidden sm:flex flex-col bg-card border rounded-2xl shadow-2xl ring-1 ring-primary/20 overflow-hidden",
            "animate-in fade-in slide-in-from-bottom-4 duration-200",
          )}
          style={{ right: popupOffset.right, bottom: popupOffset.bottom }}
        >
          <header
            className="h-11 px-3 flex items-center gap-2 shrink-0 border-b"
            style={{ backgroundColor: '#1B1E2C', color: '#FFDA45' }}
          >
            <div className="h-7 w-7 rounded-md flex items-center justify-center" style={{ backgroundColor: '#FFDA45' }}>
              <MessageCircle className="h-4 w-4" style={{ color: '#1B1E2C' }} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold leading-tight">Chat Neovale</div>
              <div className="text-[10px] opacity-70 leading-tight">
                {unread > 0 ? `${unread} não lida${unread > 1 ? 's' : ''}` : 'Tudo em dia'}
              </div>
            </div>
            <button
              type="button"
              onClick={openFullScreen}
              title="Abrir em tela cheia"
              className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              title="Minimizar"
              className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => { setChannelId(null); setOpen(false); }}
              title="Fechar"
              className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </header>
          <div className="flex-1 min-h-0">
            <ChatPopupBody
              activeChannelId={state.channelId}
              onSelectChannel={setChannelId}
            />
          </div>
        </div>
      )}
    </>
  );
}
