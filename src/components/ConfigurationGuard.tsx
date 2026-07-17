import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useConfigurationStatus } from '@/hooks/useConfigurationStatus';

interface ConfigurationGuardProps {
  /** The step key this page depends on being unblocked */
  stepKey: string;
  children: React.ReactNode;
  /** If true, content is rendered as disabled overlay instead of hidden */
  softBlock?: boolean;
}

export function ConfigurationGuard({ stepKey, children, softBlock = true }: ConfigurationGuardProps) {
  const { getMissingPrerequisites, isBlocked, loading, steps } = useConfigurationStatus();

  if (loading) return <>{children}</>;

  const blocked = isBlocked(stepKey);
  if (!blocked) return <>{children}</>;

  const missing = getMissingPrerequisites(stepKey);
  const step = steps.find((s) => s.key === stepKey);
  const firstMissingStep = steps.find((s) => missing.includes(s.label));

  const alertContent = (
    <Alert variant="destructive" className="border-destructive/50 bg-destructive/5 mb-6">
      <Lock className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        Pré-requisitos não atendidos
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-2">
          Para utilizar <strong>{step?.label ?? stepKey}</strong>, é necessário primeiro configurar:
        </p>
        <ul className="list-disc pl-5 space-y-1 mb-3">
          {missing.map((m) => (
            <li key={m} className="text-sm font-medium">{m}</li>
          ))}
        </ul>
        {firstMissingStep && (
          <Button variant="outline" size="sm" asChild>
            <Link to={firstMissingStep.path}>
              Configurar {firstMissingStep.label}
            </Link>
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );

  if (!softBlock) {
    return alertContent;
  }

  return (
    <div className="relative">
      {alertContent}
      <div className="pointer-events-none opacity-40 select-none" aria-hidden="true">
        {children}
      </div>
    </div>
  );
}
