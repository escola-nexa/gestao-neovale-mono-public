import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateDigitalSignaturesDto } from '../dto/create-digital_signatures.dto';
import { UpdateDigitalSignaturesDto } from '../dto/update-digital_signatures.dto';
import { FindDigitalSignaturesService } from '../services/find-digital_signatures.service';
import { CreateDigitalSignaturesService } from '../services/create-digital_signatures.service';
import { UpdateDigitalSignaturesService } from '../services/update-digital_signatures.service';
import { DeleteDigitalSignaturesService } from '../services/delete-digital_signatures.service';

@Controller('digital-signatures')
@UseGuards(JwtAuthGuard)
export class DigitalSignaturesController {
  constructor(
    private readonly findService: FindDigitalSignaturesService,
    private readonly createService: CreateDigitalSignaturesService,
    private readonly updateService: UpdateDigitalSignaturesService,
    private readonly deleteService: DeleteDigitalSignaturesService,
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
  async create(@Body() dto: CreateDigitalSignaturesDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateDigitalSignaturesDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
