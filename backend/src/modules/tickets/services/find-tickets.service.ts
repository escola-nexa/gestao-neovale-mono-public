import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Tickets } from '../entities/tickets.entity';

@Injectable()
export class FindTicketsService {
  constructor(
    @InjectRepository(Tickets)
    private readonly repository: Repository<Tickets>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(organizationId: string, role?: string, userId?: string): Promise<any[]> {
    const query = this.repository.createQueryBuilder('t')
      // removed leftJoinAndSelect('t.school', 'schools') since relation is missing
      .where('t.organization_id = :organizationId', { organizationId })
      .orderBy('t.updated_at', 'DESC', 'NULLS LAST');

    if (role === 'professor' && userId) {
      query.andWhere('t.opened_by_id = :userId', { userId });
    }

    return query.getMany();
  }

  async findOne(id: string, organizationId: string): Promise<any | null> {
    return this.repository.createQueryBuilder('t')
      // removed leftJoinAndSelect('t.school', 'schools')
      .where('t.id = :id', { id })
      .andWhere('t.organization_id = :organizationId', { organizationId })
      .getOne();
  }

  async getTicketsWithMedia(organizationId: string) {
    const result = await this.dataSource.query(`
      SELECT DISTINCT ticket_id 
      FROM ticket_messages 
      WHERE attachments IS NOT NULL AND attachments::text != '[]'
      AND ticket_id IN (SELECT id FROM tickets WHERE organization_id = $1)
    `, [organizationId]);
    return result.map((r: any) => r.ticket_id);
  }

  async getTicketActivityMessages(ids: string[]) {
    if (!ids.length) return [];
    return this.dataSource.query(`
      SELECT ticket_id, author_id, message, is_internal_note, attachments, created_at 
      FROM ticket_messages 
      WHERE ticket_id = ANY($1) 
      ORDER BY created_at ASC
    `, [ids]);
  }

  async getTicketsEnrichmentData(organizationId: string, ids: string[]) {
    const [categories, assignees] = await Promise.all([
      this.dataSource.query(`SELECT id, name, color FROM ticket_categories WHERE organization_id = $1`, [organizationId]),
      ids.length ? this.dataSource.query(`SELECT ticket_id, user_id FROM ticket_assignees WHERE ticket_id = ANY($1)`, [ids]) : []
    ]);
    return { categories, assignees };
  }

  async getTicketTags(organizationId: string) {
    return this.dataSource.query(`SELECT * FROM ticket_tags WHERE organization_id = $1 ORDER BY name`, [organizationId]);
  }

  async getAssignees(ticketId: string) {
    const result = await this.dataSource.query(`SELECT user_id FROM ticket_assignees WHERE ticket_id = $1`, [ticketId]);
    return result.map((r: any) => r.user_id);
  }

  async getTicketLabels(ticketId: string) {
    const result = await this.dataSource.query(`SELECT label_id FROM ticket_label_assignments WHERE ticket_id = $1`, [ticketId]);
    return result.map((r: any) => ({ label_id: r.label_id }));
  }

  async getTicketChecklists(ticketId: string) {
    return this.dataSource.query(`SELECT * FROM ticket_checklists WHERE ticket_id = $1 ORDER BY position`, [ticketId]);
  }
}
