import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AddVirtualNumberUseCase } from '../../../application/use-cases/add-virtual-number.use-case';
import { CreateMaskingSessionUseCase } from '../../../application/use-cases/create-masking-session.use-case';
import { EndMaskingSessionUseCase } from '../../../application/use-cases/end-masking-session.use-case';
import { GetMaskingSessionUseCase } from '../../../application/use-cases/get-masking-session.use-case';
import {
  AddVirtualNumberDto,
  CreateMaskingSessionDto,
  MaskingSessionResponse,
  VirtualNumberResponse,
} from '../dto/masking.dto';
import { unwrap } from '../filters/problem';
import { ApiKeyGuard } from '../guards/auth.guards';

/** Internal API: other services create/end masking sessions here. Protected by X-Api-Key. */
@ApiTags('Masking')
@ApiSecurity('api-key')
@ApiHeader({ name: 'X-Api-Key', required: true })
@UseGuards(ApiKeyGuard)
@Controller({ version: '1' })
export class MaskingSessionsController {
  constructor(
    private readonly createSession: CreateMaskingSessionUseCase,
    private readonly getSession: GetMaskingSessionUseCase,
    private readonly endSession: EndMaskingSessionUseCase,
    private readonly addVirtualNumber: AddVirtualNumberUseCase,
  ) {}

  @Post('masking-sessions')
  async create(@Body() dto: CreateMaskingSessionDto): Promise<MaskingSessionResponse> {
    return MaskingSessionResponse.from(unwrap(await this.createSession.execute(dto)));
  }

  @Get('masking-sessions/:id')
  async get(@Param('id', ParseUUIDPipe) id: string): Promise<MaskingSessionResponse> {
    return MaskingSessionResponse.from(unwrap(await this.getSession.execute(id)));
  }

  @Delete('masking-sessions/:id')
  @HttpCode(204)
  async end(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    unwrap(await this.endSession.execute(id));
  }

  @Post('virtual-numbers')
  async addNumber(@Body() dto: AddVirtualNumberDto): Promise<VirtualNumberResponse> {
    return VirtualNumberResponse.from(unwrap(await this.addVirtualNumber.execute(dto.number)));
  }
}
