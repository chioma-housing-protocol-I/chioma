export class AgreementStatusChangedEvent {
  constructor(
    public readonly agreementId: string,
    public readonly oldStatus: string,
    public readonly newStatus: string,
    public readonly reason?: string,
    public readonly metadata?: Record<string, unknown>,
  ) {}
}
