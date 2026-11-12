import { Module } from '@nestjs/common';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { AddVirtualNumberUseCase } from './use-cases/add-virtual-number.use-case';
import { CreateMaskingSessionUseCase } from './use-cases/create-masking-session.use-case';
import { EndMaskingSessionUseCase } from './use-cases/end-masking-session.use-case';
import { GetMaskingSessionUseCase } from './use-cases/get-masking-session.use-case';
import { ResolveIncomingCallUseCase } from './use-cases/resolve-incoming-call.use-case';
import { UpdateCallStatusUseCase } from './use-cases/update-call-status.use-case';

const useCases = [
  AddVirtualNumberUseCase,
  CreateMaskingSessionUseCase,
  GetMaskingSessionUseCase,
  EndMaskingSessionUseCase,
  ResolveIncomingCallUseCase,
  UpdateCallStatusUseCase,
];

@Module({
  imports: [InfrastructureModule],
  providers: useCases,
  exports: useCases,
})
export class ApplicationModule {}
