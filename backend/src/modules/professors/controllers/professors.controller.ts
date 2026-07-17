import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateProfessorsDto } from '../dto/create-professors.dto';
import { UpdateProfessorsDto } from '../dto/update-professors.dto';
import { FindProfessorsService } from '../services/find-professors.service';
import { CreateProfessorsService } from '../services/create-professors.service';
import { UpdateProfessorsService } from '../services/update-professors.service';
import { DeleteProfessorsService } from '../services/delete-professors.service';

@Controller('professors')
@UseGuards(JwtAuthGuard)
export class ProfessorsController {
  constructor(
    private readonly findService: FindProfessorsService,
    private readonly createService: CreateProfessorsService,
    private readonly updateService: UpdateProfessorsService,
    private readonly deleteService: DeleteProfessorsService,
  ) {}

  @Get()
  async findAll(@CurrentUser() user: any, @Query('active') active?: string, @Query('schoolId') schoolId?: string) {
    return this.findService.findAll(user.organizationId || user.id, active, schoolId);
  }

  @Get(':id/schools')
  async getProfessorSchools(@Param('id') id: string) {
    return this.findService.getProfessorSchools(id);
  }

  @Get('by-user/:userId')
  async findByUserId(@Param('userId') userId: string) {
    return this.findService.findByUserId(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.findService.findOne(id, user.organizationId || user.id);
  }

  @Post()
  async create(@Body() dto: CreateProfessorsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateProfessorsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
