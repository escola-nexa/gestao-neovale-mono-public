import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateSchoolVisitParticipantsDto } from '../dto/create-school_visit_participants.dto';
import { UpdateSchoolVisitParticipantsDto } from '../dto/update-school_visit_participants.dto';
import { FindSchoolVisitParticipantsService } from '../services/find-school_visit_participants.service';
import { CreateSchoolVisitParticipantsService } from '../services/create-school_visit_participants.service';
import { UpdateSchoolVisitParticipantsService } from '../services/update-school_visit_participants.service';
import { DeleteSchoolVisitParticipantsService } from '../services/delete-school_visit_participants.service';

@Controller('school-visit-participants')
@UseGuards(JwtAuthGuard)
export class SchoolVisitParticipantsController {
  constructor(
    private readonly findService: FindSchoolVisitParticipantsService,
    private readonly createService: CreateSchoolVisitParticipantsService,
    private readonly updateService: UpdateSchoolVisitParticipantsService,
    private readonly deleteService: DeleteSchoolVisitParticipantsService,
  ) {}

  @Get()
  async findAll(@CurrentUser() user: any) {
    return this.findService.findAll(user.organizationId || user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.findService.findOne(id, user.organizationId || user.id);
  }

  @Post()
  async create(@Body() dto: CreateSchoolVisitParticipantsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSchoolVisitParticipantsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
