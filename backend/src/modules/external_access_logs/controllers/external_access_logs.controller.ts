import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateExternalAccessLogsDto } from '../dto/create-external_access_logs.dto';
import { UpdateExternalAccessLogsDto } from '../dto/update-external_access_logs.dto';
import { FindExternalAccessLogsService } from '../services/find-external_access_logs.service';
import { CreateExternalAccessLogsService } from '../services/create-external_access_logs.service';
import { UpdateExternalAccessLogsService } from '../services/update-external_access_logs.service';
import { DeleteExternalAccessLogsService } from '../services/delete-external_access_logs.service';

@Controller('external-access-logs')
@UseGuards(JwtAuthGuard)
export class ExternalAccessLogsController {
  constructor(
    private readonly findService: FindExternalAccessLogsService,
    private readonly createService: CreateExternalAccessLogsService,
    private readonly updateService: UpdateExternalAccessLogsService,
    private readonly deleteService: DeleteExternalAccessLogsService,
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
  async create(@Body() dto: CreateExternalAccessLogsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateExternalAccessLogsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
