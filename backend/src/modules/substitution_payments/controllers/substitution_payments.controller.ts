import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateSubstitutionPaymentsDto } from '../dto/create-substitution_payments.dto';
import { UpdateSubstitutionPaymentsDto } from '../dto/update-substitution_payments.dto';
import { FindSubstitutionPaymentsService } from '../services/find-substitution_payments.service';
import { CreateSubstitutionPaymentsService } from '../services/create-substitution_payments.service';
import { UpdateSubstitutionPaymentsService } from '../services/update-substitution_payments.service';
import { DeleteSubstitutionPaymentsService } from '../services/delete-substitution_payments.service';

@Controller('substitution-payments')
@UseGuards(JwtAuthGuard)
export class SubstitutionPaymentsController {
  constructor(
    private readonly findService: FindSubstitutionPaymentsService,
    private readonly createService: CreateSubstitutionPaymentsService,
    private readonly updateService: UpdateSubstitutionPaymentsService,
    private readonly deleteService: DeleteSubstitutionPaymentsService,
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
  async create(@Body() dto: CreateSubstitutionPaymentsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSubstitutionPaymentsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
