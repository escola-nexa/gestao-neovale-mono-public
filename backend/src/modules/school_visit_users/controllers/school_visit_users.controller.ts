import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateSchoolVisitUsersDto } from '../dto/create-school_visit_users.dto';
import { UpdateSchoolVisitUsersDto } from '../dto/update-school_visit_users.dto';
import { FindSchoolVisitUsersService } from '../services/find-school_visit_users.service';
import { CreateSchoolVisitUsersService } from '../services/create-school_visit_users.service';
import { UpdateSchoolVisitUsersService } from '../services/update-school_visit_users.service';
import { DeleteSchoolVisitUsersService } from '../services/delete-school_visit_users.service';

@Controller('school-visit-users')
@UseGuards(JwtAuthGuard)
export class SchoolVisitUsersController {
  constructor(
    private readonly findService: FindSchoolVisitUsersService,
    private readonly createService: CreateSchoolVisitUsersService,
    private readonly updateService: UpdateSchoolVisitUsersService,
    private readonly deleteService: DeleteSchoolVisitUsersService,
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
  async create(@Body() dto: CreateSchoolVisitUsersDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSchoolVisitUsersDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
