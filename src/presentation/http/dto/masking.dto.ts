import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { MaskingSession } from '../../../domain/masking-session';
import { VirtualNumber } from '../../../domain/virtual-number';

export class CreateMaskingSessionDto {
  @ApiProperty({ example: '9876543210', description: 'Real number of the first party (e.g. rider).' })
  @IsString() @IsNotEmpty() partyA: string;

  @ApiProperty({ example: '9123456780', description: 'Real number of the second party (e.g. driver).' })
  @IsString() @IsNotEmpty() partyB: string;

  @ApiProperty({ example: '6651', description: 'Trip id from the calling service. Stored on the session and every call log.' })
  @IsString() @IsNotEmpty() @MaxLength(100) tripId: string;

  @ApiProperty({ example: 'Acme Corp', description: 'Tenant/customer name. Stored on the session and every call log.' })
  @IsString() @IsNotEmpty() @MaxLength(100) tenantName: string;

  @ApiPropertyOptional({ example: 60, description: 'Session lifetime. Defaults to SESSION_TTL_MINUTES.' })
  @IsOptional() @IsInt() @Min(1) @Max(1440) ttlMinutes?: number;

  @ApiPropertyOptional({ example: 'ride-1234', description: 'Your own id for this session (booking, ride, order...).' })
  @IsOptional() @IsString() @MaxLength(100) referenceId?: string;
}

export class AddVirtualNumberDto {
  @ApiProperty({ example: '08044556677', description: 'Exotel number (ExoPhone) to add to the pool.' })
  @IsString() @IsNotEmpty() number: string;
}

export class MaskingSessionResponse {
  @ApiProperty() id: string;
  @ApiProperty() partyA: string;
  @ApiProperty() partyB: string;
  @ApiProperty({ description: 'The number both parties dial to reach each other.' }) virtualNumber: string;
  @ApiProperty({ nullable: true }) referenceId: string | null;
  @ApiProperty() tripId: string;
  @ApiProperty() tenantName: string;
  @ApiProperty({ enum: ['active', 'ended'] }) status: string;
  @ApiProperty() expiresAt: Date;
  @ApiProperty() createdAt: Date;

  static from(s: MaskingSession): MaskingSessionResponse {
    return {
      id: s.id,
      partyA: s.partyA,
      partyB: s.partyB,
      virtualNumber: s.virtualNumber,
      referenceId: s.referenceId,
      tripId: s.tripId,
      tenantName: s.tenantName,
      status: s.status,
      expiresAt: s.expiresAt,
      createdAt: s.createdAt,
    };
  }
}

export class VirtualNumberResponse {
  @ApiProperty() id: string;
  @ApiProperty() number: string;
  @ApiProperty() isActive: boolean;

  static from(v: VirtualNumber): VirtualNumberResponse {
    return { id: v.id, number: v.number, isActive: v.isActive };
  }
}
