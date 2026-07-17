import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profiles } from '../../profiles/entities/profiles.entity';
import { UserRoles } from '../../user_roles/entities/user_roles.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    @InjectRepository(Profiles)
    private profilesRepository: Repository<Profiles>,
    @InjectRepository(UserRoles)
    private userRolesRepository: Repository<UserRoles>
  ) {}

  async signIn(email: string, pass: string): Promise<any> {
    const profile = await this.profilesRepository.findOne({
      where: { email },
      select: ['id', 'userId', 'email', 'fullName', 'password']
    });

    let isValid = false;
    if (profile) {
      isValid = await bcrypt.compare(pass, profile.password);
    }

    if (isValid) {
      const role = await this.userRolesRepository.findOne({ where: { userId: profile.userId } });
      console.log('Login attempt for profile userId:', profile.userId, 'Found role:', role);
      const payload = { 
        sub: profile.userId, 
        email: profile.email,
        role: role?.role || 'professor',
        fullName: profile.fullName,
        organizationId: role?.organizationId || null
      };
      return {
        access_token: await this.jwtService.signAsync(payload),
        user: {
           id: profile.userId,
           email: profile.email,
           fullName: profile.fullName,
           role: role?.role || 'professor',
           organizationId: role?.organizationId || null
        }
      };
    }
    throw new UnauthorizedException('Credenciais inválidas');
  }
}
