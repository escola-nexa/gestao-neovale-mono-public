import { Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { User } from 'lucide-react';
import { useProfileData } from './hooks/useProfileData';
import { ProfileHeader } from './components/ProfileHeader';
import { PersonalInfoCard } from './components/PersonalInfoCard';
import { SecurityCard } from './components/SecurityCard';
import { RoleSummaryCards } from './components/RoleSummaryCards';
import { QuickActionsCard } from './components/QuickActionsCard';
import { ProfessionalCard } from './components/ProfessionalCard';

export default function MeuPerfilPage() {
  const { profile, summary, loading, updateProfile, uploadAvatar, changePassword } = useProfileData();

  if (loading || !profile) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumbs={[{ label: 'Meu Perfil' }]}
        title="Meu Perfil"
        description="Gerencie seus dados pessoais, segurança e informações da conta"
        icon={User}
      />

      <ProfileHeader profile={profile} onUploadAvatar={uploadAvatar} />

      <RoleSummaryCards role={profile.role} summary={summary} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-5">
          <PersonalInfoCard profile={profile} onUpdate={updateProfile} />
          <SecurityCard createdAt={profile.created_at} onChangePassword={changePassword} />
        </div>
        <div className="space-y-5">
          <ProfessionalCard
            role={profile.role}
            bindings={summary.bindings}
            organizationName={profile.organization_name}
          />
          <QuickActionsCard role={profile.role} />
        </div>
      </div>
    </div>
  );
}
