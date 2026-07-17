import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateFolhaPontoGeneratedLogDto } from '../dto/create-folha_ponto_generated_log.dto';
import { UpdateFolhaPontoGeneratedLogDto } from '../dto/update-folha_ponto_generated_log.dto';
import { FindFolhaPontoGeneratedLogService } from '../services/find-folha_ponto_generated_log.service';
import { CreateFolhaPontoGeneratedLogService } from '../services/create-folha_ponto_generated_log.service';
import { UpdateFolhaPontoGeneratedLogService } from '../services/update-folha_ponto_generated_log.service';
import { DeleteFolhaPontoGeneratedLogService } from '../services/delete-folha_ponto_generated_log.service';

@Controller('folha-ponto-generated-log')
@UseGuards(JwtAuthGuard)
export class FolhaPontoGeneratedLogController {
  constructor(
    private readonly findService: FindFolhaPontoGeneratedLogService,
    private readonly createService: CreateFolhaPontoGeneratedLogService,
    private readonly updateService: UpdateFolhaPontoGeneratedLogService,
    private readonly deleteService: DeleteFolhaPontoGeneratedLogService,
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
  async create(@Body() dto: CreateFolhaPontoGeneratedLogDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFolhaPontoGeneratedLogDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
