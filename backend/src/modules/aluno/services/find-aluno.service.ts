import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Aluno } from '../entities/aluno.entity';
import { Enrollment } from '../entities/enrollment.entity';

@Injectable()
export class FindAlunoService {
  constructor(
    @InjectRepository(Aluno)
    private readonly alunoRepository: Repository<Aluno>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
  ) {}

  async findAll(params: {
    schoolId: string;
    classGroupId?: string;
    statusFilter?: string;
    searchTerm?: string;
    page: number;
    pageSize: number;
  }): Promise<{ data: Aluno[]; count: number }> {
    const { schoolId, classGroupId, statusFilter, searchTerm, page, pageSize } = params;

    const query = this.alunoRepository.createQueryBuilder('student')
      .innerJoin('enrollments', 'e', 'e.student_id = student.id')
      .where('e.school_id = :schoolId', { schoolId })
      .andWhere("e.status = 'ativa'");

    if (classGroupId && classGroupId !== 'all') {
      query.andWhere('e.class_group_id = :classGroupId', { classGroupId });
    }

    if (statusFilter && statusFilter !== 'all') {
      query.andWhere('student.status = :statusFilter', { statusFilter });
    }

    if (searchTerm) {
      query.andWhere(
        '(student.nome_completo ILIKE :searchTerm OR student.codigo_matricula ILIKE :searchTerm OR student.email ILIKE :searchTerm)',
        { searchTerm: `%${searchTerm}%` }
      );
    }

    // Select distinct students
    query.select('student.*') // Select all columns of student
         .groupBy('student.id')
         .orderBy('student.nome_completo', 'ASC');

    // Count is tricky with group by, let's get the count query
    const count = await query.getCount();

    // Pagination
    const offset = (page - 1) * pageSize;
    query.offset(offset).limit(pageSize);

    // We can't use getMany() nicely with raw select('student.*') and group by if we don't map it properly.
    // Let's use getRawMany and map to entities, or just use getMany() if we configure the alias correctly.
    // Instead of group by, let's just distinct.
    
    // Better TypeORM approach for distinct with pagination:
    const subQuery = query.clone()
      .select('student.id')
      .groupBy('student.id');
    
    const countResult = await subQuery.getRawMany();
    const totalCount = countResult.length;

    query.select('student.id').offset(offset).limit(pageSize);
    const paginatedIds = await query.getRawMany();
    const ids = paginatedIds.map(row => row.student_id);

    if (ids.length === 0) {
      return { data: [], count: 0 };
    }

    const data = await this.alunoRepository.createQueryBuilder('student')
      .whereInIds(ids)
      .orderBy('student.nome_completo', 'ASC')
      .getMany();

    return { data, count: totalCount };
  }

  async findAllByUser(userId: string): Promise<Aluno[]> {
    // Legacy support if needed
    return this.alunoRepository.find();
  }
}
