import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Profiles } from '../entities/profiles.entity';

@Injectable()
export class FindProfilesService {
  constructor(
    @InjectRepository(Profiles)
    private readonly repository: Repository<Profiles>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(organizationId: string): Promise<Profiles[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<Profiles | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }

  async findByRole(role: string, organizationId: string): Promise<any[]> {
    const roles = await this.dataSource.query(`SELECT user_id FROM user_roles WHERE role = $1 AND organization_id = $2`, [role, organizationId]);
    if (!roles.length) return [];
    const userIds = roles.map((r: any) => r.user_id);
    return this.dataSource.query(`SELECT user_id, full_name, avatar_url FROM profiles WHERE user_id = ANY($1)`, [userIds]);
  }

  async getStaffByRoles(organizationId: string, rolesList: string[]): Promise<any[]> {
    const roles = await this.dataSource.query(`SELECT user_id, role FROM user_roles WHERE role = ANY($1) AND organization_id = $2`, [rolesList, organizationId]);
    if (!roles.length) return [];
    const userIds = roles.map((r: any) => r.user_id);
    const profiles = await this.dataSource.query(`SELECT user_id, full_name FROM profiles WHERE user_id = ANY($1)`, [userIds]);
    
    const roleMap: Record<string, string> = {};
    roles.forEach((r: any) => { roleMap[r.user_id] = r.role; });
    
    return profiles.map((p: any) => ({
      user_id: p.user_id,
      full_name: p.full_name,
      role: roleMap[p.user_id] || ''
    }));
  }

  async getProfilesByIds(ids: string[]): Promise<any[]> {
    if (!ids.length) return [];
    return this.dataSource.query(`SELECT user_id, full_name FROM profiles WHERE user_id = ANY($1)`, [ids]);
  }

  async getUserRole(userId: string): Promise<any> {
    const result = await this.dataSource.query(`SELECT role FROM user_roles WHERE user_id = $1 LIMIT 1`, [userId]);
    return result[0] || null;
  }

  async getAssignedTickets(userId: string): Promise<any[]> {
    return this.dataSource.query(`SELECT ticket_id FROM ticket_assignees WHERE user_id = $1`, [userId]);
  }
}
