import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateImportBatchesDto } from '../dto/create-import_batches.dto';
import { UpdateImportBatchesDto } from '../dto/update-import_batches.dto';
import { FindImportBatchesService } from '../services/find-import_batches.service';
import { CreateImportBatchesService } from '../services/create-import_batches.service';
import { UpdateImportBatchesService } from '../services/update-import_batches.service';
import { DeleteImportBatchesService } from '../services/delete-import_batches.service';

@Controller('import-batches')
@UseGuards(JwtAuthGuard)
export class ImportBatchesController {
  constructor(
    private readonly findService: FindImportBatchesService,
    private readonly createService: CreateImportBatchesService,
    private readonly updateService: UpdateImportBatchesService,
    private readonly deleteService: DeleteImportBatchesService,
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
  async create(@Body() dto: CreateImportBatchesDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateImportBatchesDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
