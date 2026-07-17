import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateImportBatchRowsDto } from '../dto/create-import_batch_rows.dto';
import { UpdateImportBatchRowsDto } from '../dto/update-import_batch_rows.dto';
import { FindImportBatchRowsService } from '../services/find-import_batch_rows.service';
import { CreateImportBatchRowsService } from '../services/create-import_batch_rows.service';
import { UpdateImportBatchRowsService } from '../services/update-import_batch_rows.service';
import { DeleteImportBatchRowsService } from '../services/delete-import_batch_rows.service';

@Controller('import-batch-rows')
@UseGuards(JwtAuthGuard)
export class ImportBatchRowsController {
  constructor(
    private readonly findService: FindImportBatchRowsService,
    private readonly createService: CreateImportBatchRowsService,
    private readonly updateService: UpdateImportBatchRowsService,
    private readonly deleteService: DeleteImportBatchRowsService,
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
  async create(@Body() dto: CreateImportBatchRowsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateImportBatchRowsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
