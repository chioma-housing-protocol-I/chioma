import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AgreementStatusChangedEvent } from '../events/agreement-status-changed.event';
import { safeEventListener } from '../../../common/utils/safe-event-listener';

@Injectable()
export class AgreementsEventListener {
  private readonly logger = new Logger(AgreementsEventListener.name);

  constructor() {}

  @OnEvent('agreement.status.changed')
  handleStatusChanged(event: AgreementStatusChangedEvent): Promise<void> {
    return safeEventListener(
      'agreement.status.changed',
      (changed: AgreementStatusChangedEvent) => {
        this.logger.log(
          `Agreement ${changed.agreementId} status changed from ${changed.oldStatus} to ${changed.newStatus}`,
        );
      },
      this.logger,
    )(event);
  }
}
