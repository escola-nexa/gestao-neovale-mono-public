import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'super_secret_jwt_key',
    });
  }

  async validate(payload: any) {
    // Retorna o objeto user que será injetado no req.user (Simulando o padrão do Supabase)
    return { 
      id: payload.sub, 
      email: payload.email,
      role: payload.role,
      fullName: payload.fullName,
      organizationId: payload.organizationId
    };
  }
}
