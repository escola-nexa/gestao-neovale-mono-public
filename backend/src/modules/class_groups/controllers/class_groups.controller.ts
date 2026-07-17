import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateClassGroupsDto } from '../dto/create-class_groups.dto';
import { UpdateClassGroupsDto } from '../dto/update-class_groups.dto';
import { FindClassGroupsService } from '../services/find-class_groups.service';
import { CreateClassGroupsService } from '../services/create-class_groups.service';
import { UpdateClassGroupsService } from '../services/update-class_groups.service';
import { DeleteClassGroupsService } from '../services/delete-class_groups.service';

@Controller('class-groups')
@UseGuards(JwtAuthGuard)
export class ClassGroupsController {
  constructor(
    private readonly findService: FindClassGroupsService,
    private readonly createService: CreateClassGroupsService,
    private readonly updateService: UpdateClassGroupsService,
    private readonly deleteService: DeleteClassGroupsService,
  ) {}

  @Get()
  async findAll(
    @CurrentUser() user: any,
    @Query('schoolId') schoolId?: string,
    @Query('status') status?: string,
    @Query('calendarId') calendarId?: string,
  ) {
    return this.findService.findAll(user.organizationId || user.id, schoolId, status, calendarId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.findService.findOne(id, user.organizationId || user.id);
  }

  @Post()
  async create(@Body() dto: CreateClassGroupsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateClassGroupsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
