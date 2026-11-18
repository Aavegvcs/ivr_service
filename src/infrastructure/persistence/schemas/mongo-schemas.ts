import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/**
 * MongoDB document shapes. Kept separate from the domain classes so the domain
 * stays free of Mongoose; the repositories map between the two.
 * The domain id (a UUID string) is stored as _id.
 */

@Schema({ collection: 'virtual_numbers', versionKey: false })
export class VirtualNumberDoc {
  @Prop({ type: String }) _id: string;
  @Prop({ type: String, required: true, unique: true }) number: string;
  @Prop({ type: Boolean, default: true }) isActive: boolean;
  @Prop({ type: Date, required: true }) createdAt: Date;
}
export const VirtualNumberSchema = SchemaFactory.createForClass(VirtualNumberDoc);

@Schema({ collection: 'masking_sessions', versionKey: false })
export class MaskingSessionDoc {
  @Prop({ type: String }) _id: string;
  @Prop({ type: String, required: true }) partyA: string;
  @Prop({ type: String, required: true }) partyB: string;
  @Prop({ type: String, required: true }) virtualNumber: string;
  @Prop({ type: String, default: null }) referenceId: string | null;
  @Prop({ type: String, required: true }) tripId: string;
  @Prop({ type: String, required: true }) tenantName: string;
  @Prop({ type: String, required: true }) status: string;
  @Prop({ type: Date, required: true }) expiresAt: Date;
  @Prop({ type: Date, required: true }) createdAt: Date;
}
export const MaskingSessionSchema = SchemaFactory.createForClass(MaskingSessionDoc);
MaskingSessionSchema.index({ virtualNumber: 1, status: 1, expiresAt: 1 });

@Schema({ collection: 'call_logs', versionKey: false })
export class CallLogDoc {
  @Prop({ type: String }) _id: string;
  @Prop({ type: String, required: true, unique: true }) callSid: string;
  @Prop({ type: String, required: true, index: true }) sessionId: string;
  @Prop({ type: String, required: true, index: true }) tripId: string;
  @Prop({ type: String, required: true, index: true }) tenantName: string;
  @Prop({ type: String, required: true }) virtualNumber: string;
  @Prop({ type: String, required: true }) callerNumber: string;
  @Prop({ type: String, required: true }) destinationNumber: string;
  @Prop({ type: String, required: true }) status: string;
  @Prop({ type: Number, default: null }) durationSeconds: number | null;
  @Prop({ type: String, default: null }) recordingUrl: string | null;
  /** Raw callbacks received from the provider, kept for auditing. */
  @Prop({ type: [Object], default: [] }) callbacks: Record<string, unknown>[];
  @Prop({ type: Date, required: true }) createdAt: Date;
  @Prop({ type: Date, required: true }) updatedAt: Date;
}
export const CallLogSchema = SchemaFactory.createForClass(CallLogDoc);
