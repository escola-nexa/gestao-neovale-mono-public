import { Component, ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message?: string;
  recoveryAttempts: number;
}

/**
 * Erros conhecidos como "transientes" — geralmente causados por:
 *  - Tradução automática do navegador (Google Translate em Chrome Mobile),
 *    que substitui text nodes e quebra a reconciliação do React
 *  - Re-render concorrente do Radix Tabs durante animação
 *
 * Para esses erros tentamos recuperação silenciosa (até N vezes) antes de
 * exibir a tela de erro.
 */
function isTransientDomError(message?: string): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes('removechild') ||
    m.includes('insertbefore') ||
    m.includes('not a child of this node') ||
    m.includes('não é filho deste nó')
  );
}

export class ExternalErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, recoveryAttempts: 0 };

  static getDerivedStateFromError(error: any): Partial<State> {
    return { hasError: true, message: error?.message || 'Erro inesperado ao renderizar o conteúdo.' };
  }

  componentDidCatch(error: any, info: any) {
    // eslint-disable-next-line no-console
    console.error('[ExternalAccess ErrorBoundary]', error, info);

    // Recuperação automática para erros transientes de DOM (até 2 tentativas).
    if (isTransientDomError(error?.message) && this.state.recoveryAttempts < 2) {
      // Pequeno delay para deixar o DOM estabilizar antes de re-renderizar.
      setTimeout(() => {
        this.setState((prev) => ({
          hasError: false,
          message: undefined,
          recoveryAttempts: prev.recoveryAttempts + 1,
        }));
      }, 80);
    }
  }

  reset = () => this.setState({ hasError: false, message: undefined, recoveryAttempts: 0 });

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
              <AlertTriangle className="h-10 w-10 text-destructive" />
              <h2 className="text-base font-semibold text-foreground">Não foi possível exibir os documentos</h2>
              <p className="text-sm text-muted-foreground">
                {this.state.message}
              </p>
              <p className="text-xs text-muted-foreground">
                Dica: desative a tradução automática do navegador (Google Tradutor) para esta página e tente novamente.
              </p>
              <Button variant="outline" onClick={this.reset}>
                Tentar novamente
              </Button>
              <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
                Recarregar página
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    // `translate="no"` + classe `notranslate` evitam que o Google Translate
    // mexa nos text nodes desta árvore, que é a causa mais comum do
    // "Failed to execute 'removeChild' on 'Node'".
    return (
      <div translate="no" className="notranslate">
        {this.props.children}
      </div>
    );
  }
}
