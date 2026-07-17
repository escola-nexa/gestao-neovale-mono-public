import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateFinancialUserScopesDto } from '../dto/create-financial_user_scopes.dto';
import { UpdateFinancialUserScopesDto } from '../dto/update-financial_user_scopes.dto';
import { FindFinancialUserScopesService } from '../services/find-financial_user_scopes.service';
import { CreateFinancialUserScopesService } from '../services/create-financial_user_scopes.service';
import { UpdateFinancialUserScopesService } from '../services/update-financial_user_scopes.service';
import { DeleteFinancialUserScopesService } from '../services/delete-financial_user_scopes.service';

@Controller('financial-user-scopes')
@UseGuards(JwtAuthGuard)
export class FinancialUserScopesController {
  constructor(
    private readonly findService: FindFinancialUserScopesService,
    private readonly createService: CreateFinancialUserScopesService,
    private readonly updateService: UpdateFinancialUserScopesService,
    private readonly deleteService: DeleteFinancialUserScopesService,
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
  async create(@Body() dto: CreateFinancialUserScopesDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFinancialUserScopesDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
