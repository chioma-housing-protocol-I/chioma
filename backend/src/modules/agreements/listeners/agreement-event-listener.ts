import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AgreementStatusChangedEvent } from '../events/agreement-status-changed.event';

@Injectable()
export class AgreementsEventListener {
  private readonly logger = new Logger(AgreementsEventListener.name);

  constructor() {}

  @OnEvent('agreement.status.changed')
  handleStatusChanged(event: AgreementStatusChangedEvent) {
    this.logger.log(
      `Agreement ${event.agreementId} status changed from ${event.oldStatus} to ${event.newStatus}`,
    );

    // TODO: Send email/in-app notification to relevant parties
    // Example: await this.alertService.sendAgreementStatusNotification(...)
  }
}
}
