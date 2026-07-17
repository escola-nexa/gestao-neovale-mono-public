import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateExternalLinksDto } from '../dto/create-external_links.dto';
import { UpdateExternalLinksDto } from '../dto/update-external_links.dto';
import { FindExternalLinksService } from '../services/find-external_links.service';
import { CreateExternalLinksService } from '../services/create-external_links.service';
import { UpdateExternalLinksService } from '../services/update-external_links.service';
import { DeleteExternalLinksService } from '../services/delete-external_links.service';

@Controller('external-links')
@UseGuards(JwtAuthGuard)
export class ExternalLinksController {
  constructor(
    private readonly findService: FindExternalLinksService,
    private readonly createService: CreateExternalLinksService,
    private readonly updateService: UpdateExternalLinksService,
    private readonly deleteService: DeleteExternalLinksService,
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
  async create(@Body() dto: CreateExternalLinksDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateExternalLinksDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
