export interface EmailTemplate {
  subject: string;
  html: string;
}

export interface SmsTemplate {
  content: string;
}

export interface PushTemplate {
  title: string;
  body: string;
  data?: any;
}

export class NotificationUtils {
  /**
   * Formats data into a standardized email template
   */
  static formatEmailNotification(
    title: string,
    message: string,
  ): EmailTemplate {
    return {
      subject: title,
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>${title}</h2>
          <p>${message}</p>
          <hr />
          <small>Sent via Chioma Protocol</small>
        </div>
      `,
    };
  }

  /**
   * Formats data into a standardized SMS template
   */
  static formatSmsNotification(message: string): SmsTemplate {
    return {
      content: message,
    };
  }

  /**
   * Formats data into a standardized push notification template
   */
  static formatPushNotification(
    title: string,
    body: string,
    data?: any,
  ): PushTemplate {
    return {
      title,
      body,
      data,
    };
  }

  /**
   * Builds context for non-template based notifications
   */
  static buildNotificationContext(data: any): any {
    return {
      ...data,
      timestamp: new Date().toISOString(),
    };
  }
}
