/** A number from the telephony provider's pool (an "ExoPhone" in Exotel terms). */
export class VirtualNumber {
  constructor(
    readonly id: string,
    readonly number: string,
    readonly isActive: boolean,
    readonly createdAt: Date,
  ) {}
}
