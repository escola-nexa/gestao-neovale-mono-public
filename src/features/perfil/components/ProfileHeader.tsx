import { useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Camera, Mail, Phone, Shield, School, Loader2 } from 'lucide-react';
import type { ProfileData } from '../hooks/useProfileData';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  coordenador: 'Coordenador',
  professor: 'Professor',
};

interface Props {
  profile: ProfileData;
  onUploadAvatar: (file: File) => Promise<string | null>;
}

export function ProfileHeader({ profile, onUploadAvatar }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const initials = profile.full_name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    await onUploadAvatar(file);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <Card className="bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground border-0 shadow-lg overflow-hidden">
      <CardContent className="p-5 sm:p-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Avatar */}
          <div className="relative group">
            <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-4 border-primary-foreground/20 shadow-xl">
              <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name} />
              <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground text-2xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              ) : (
                <Camera className="h-6 w-6 text-white" />
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold truncate">{profile.full_name}</h1>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
              <Badge className="bg-primary-foreground/20 text-primary-foreground border-0 text-xs font-semibold">
                {ROLE_LABELS[profile.role] || profile.role}
              </Badge>
              {profile.organization_name && (
                <Badge variant="outline" className="border-primary-foreground/30 text-primary-foreground/90 text-xs">
                  <School className="h-3 w-3 mr-1" />
                  {profile.organization_name}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 mt-3 text-sm text-primary-foreground/75">
              <span className="flex items-center gap-1.5 truncate">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                {profile.email}
              </span>
              {profile.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  {profile.phone}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
