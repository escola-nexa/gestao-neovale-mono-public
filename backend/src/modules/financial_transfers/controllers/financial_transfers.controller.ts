import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateFinancialTransfersDto } from '../dto/create-financial_transfers.dto';
import { UpdateFinancialTransfersDto } from '../dto/update-financial_transfers.dto';
import { FindFinancialTransfersService } from '../services/find-financial_transfers.service';
import { CreateFinancialTransfersService } from '../services/create-financial_transfers.service';
import { UpdateFinancialTransfersService } from '../services/update-financial_transfers.service';
import { DeleteFinancialTransfersService } from '../services/delete-financial_transfers.service';

@Controller('financial-transfers')
@UseGuards(JwtAuthGuard)
export class FinancialTransfersController {
  constructor(
    private readonly findService: FindFinancialTransfersService,
    private readonly createService: CreateFinancialTransfersService,
    private readonly updateService: UpdateFinancialTransfersService,
    private readonly deleteService: DeleteFinancialTransfersService,
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
  async create(@Body() dto: CreateFinancialTransfersDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFinancialTransfersDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
