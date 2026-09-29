import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  IsDateString,
  IsObject,
} from 'class-validator';

export class CreatePaymentMethodDto {
  @IsString()
  @IsNotEmpty()
  paymentType: string;

  @IsOptional()
  @IsString()
  @Length(4, 4)
  lastFour?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  sensitiveMetadata?: Record<string, unknown>;

  /**
   * A client-side transaction/charge reference from the payment gateway's
   * own SDK (e.g. Paystack Popup/Paystack.js `reference`, or Flutterwave's
   * `tx_ref`). When provided for a CREDIT_CARD-type method, the server
   * verifies this reference against the gateway's real verify endpoint and
   * derives lastFour/expiryDate/the token from that gateway-confirmed
   * response — client-supplied lastFour/expiryDate are ignored in that case.
   * Optional because non-card payment types (e.g. BANK_TRANSFER) have no
   * gateway tokenization step.
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  gatewayReference?: string;
}
