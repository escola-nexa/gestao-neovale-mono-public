import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Send, Paperclip, Ticket, KeyRound, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const statusLabels: Record<string, string> = {
  aberto: 'Aberto', em_atendimento: 'Em Atendimento', aguardando_escola: 'Aguardando', resolvido: 'Resolvido', cancelado: 'Cancelado',
};

export default function ExternalTicketPage() {
  const { token } = useParams<{ token: string }>();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [keyword, setKeyword] = useState('');
  const [validated, setValidated] = useState(false);
  const [validating, setValidating] = useState(false);
  const [ticketData, setTicketData] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [senderName, setSenderName] = useState('');
  const [sending, setSending] = useState(false);

  const handleValidate = async () => {
    if (!keyword.trim() || !token) return;
    setValidating(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/validate-ticket-external`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
        body: JSON.stringify({ token, keyword: keyword.trim(), action: 'validate' }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || 'Palavra-chave incorreta');
        return;
      }
      setTicketData(json.data);
      setSenderName(json.data.external_author_name || '');
      setValidated(true);
    } catch {
      toast.error('Erro ao validar acesso');
    } finally {
      setValidating(false);
    }
  };

  // Poll messages every 5s when validated
  const { data: messages = [] } = useQuery({
    queryKey: ['external-ticket-messages', token],
    queryFn: async () => {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/validate-ticket-external`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
        body: JSON.stringify({ token, keyword: keyword.trim(), action: 'messages' }),
      });
      const json = await res.json();
      return json.success ? json.data?.messages || [] : [];
    },
    enabled: validated,
    refetchInterval: 5000,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !senderName.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/validate-ticket-external`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
        body: JSON.stringify({
          token, keyword: keyword.trim(), action: 'send_message',
          message: newMessage.trim(), sender_name: senderName.trim(),
        }),
      });
      const json = await res.json();
      if (!json.success) { toast.error(json.error); return; }
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ['external-ticket-messages', token] });
      toast.success('Mensagem enviada!');
    } catch {
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  if (!validated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 rounded-full bg-primary/10 p-3 w-fit">
              <KeyRound className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Acesso ao Ticket</CardTitle>
            <p className="text-sm text-muted-foreground">Insira a palavra-chave da escola para acessar o ticket.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Palavra-chave</Label>
              <Input
                type="password"
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder="Digite a palavra-chave"
                onKeyDown={e => e.key === 'Enter' && handleValidate()}
              />
            </div>
            <Button className="w-full" onClick={handleValidate} disabled={!keyword.trim() || validating}>
              {validating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Validando...</> : 'Acessar Ticket'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 max-w-3xl mx-auto">
      <div className="mb-4 flex items-center gap-3">
        <Ticket className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-lg font-bold">Ticket — {ticketData?.title}</h1>
          <p className="text-sm text-muted-foreground">{ticketData?.school_name}</p>
        </div>
        <Badge variant="outline" className="ml-auto">{statusLabels[ticketData?.status] || ticketData?.status}</Badge>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{ticketData?.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[400px] pr-4 mb-4">
            <div className="space-y-3">
              {messages.map((msg: any) => {
                const isExternal = !msg.author_id;
                return (
                <div key={msg.id} className={`flex ${isExternal ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    isExternal ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium ${isExternal ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                        {msg.sender_name}
                      </span>
                      <span className={`text-xs ${isExternal ? 'text-primary-foreground/60' : 'text-muted-foreground/60'}`}>
                        {format(new Date(msg.created_at), 'dd/MM HH:mm')}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                    {msg.attachments && msg.attachments.length > 0 && msg.attachments.map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-xs underline mt-1 inline-flex items-center gap-1">
                        <Paperclip className="h-3 w-3" /> Anexo {i + 1}
                      </a>
                    ))}
                  </div>
                </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {ticketData?.status !== 'cancelado' && ticketData?.status !== 'resolvido' && (
            <div className="border-t pt-3 space-y-2">
              <div>
                <Label className="text-xs">Seu nome</Label>
                <Input value={senderName} onChange={e => setSenderName(e.target.value)} placeholder="Seu nome" maxLength={100} />
              </div>
              <Textarea
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
                className="min-h-[60px]"
                maxLength={2000}
              />
              <Button size="sm" onClick={handleSendMessage} disabled={!newMessage.trim() || !senderName.trim() || sending} className="w-full">
                <Send className="h-4 w-4 mr-1" /> {sending ? 'Enviando...' : 'Enviar'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
