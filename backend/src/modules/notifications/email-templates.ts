// src/modules/notifications/email-templates.ts
// Centralized email templates for transactional emails.

export interface EmailTemplateData {
  recipientName?: string;
  [key: string]: any;
}

/**
 * Renders a styled HTML email wrapper around content.
 */
function wrapInLayout(title: string, content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background: #f4f4f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; }
    .header { background: #2563eb; padding: 24px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
    .body { padding: 32px 24px; color: #374151; line-height: 1.6; }
    .body h2 { color: #1f2937; margin-top: 0; }
    .body p { margin: 12px 0; }
    .btn { display: inline-block; padding: 12px 24px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 16px 0; }
    .footer { padding: 16px 24px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
    .highlight { background: #f0f9ff; border-left: 4px solid #2563eb; padding: 12px 16px; margin: 16px 0; border-radius: 0 4px 4px 0; }
    .amount { font-size: 28px; font-weight: 700; color: #2563eb; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 16px 0; border-radius: 0 4px 4px 0; }
  </style>
</head>
<body>
  <div style="padding: 20px;">
    <div class="container">
      <div class="header">
        <h1>Chioma Housing</h1>
      </div>
      <div class="body">
        ${content}
      </div>
      <div class="footer">
        <p>Chioma Housing Protocol &mdash; Decentralized Housing on Stellar</p>
        <p>You received this email because you have an account with Chioma.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ── Verification ────────────────────────────────────────────

export function verificationEmailTemplate(
  data: EmailTemplateData & { verificationUrl: string },
): string {
  return wrapInLayout(
    'Verify Your Email',
    `
    <h2>Welcome to Chioma${data.recipientName ? `, ${data.recipientName}` : ''}!</h2>
    <p>Thank you for registering. Please verify your email address to get started.</p>
    <p style="text-align: center;">
      <a class="btn" href="${data.verificationUrl}">Verify Email Address</a>
    </p>
    <p style="font-size: 13px; color: #6b7280;">If you did not create an account, you can safely ignore this email.</p>
    `,
  );
}

// ── Password Reset ──────────────────────────────────────────

export function passwordResetTemplate(
  data: EmailTemplateData & { resetUrl: string },
): string {
  return wrapInLayout(
    'Reset Your Password',
    `
    <h2>Password Reset Request</h2>
    <p>We received a request to reset your password. Click the button below to choose a new password.</p>
    <p style="text-align: center;">
      <a class="btn" href="${data.resetUrl}">Reset Password</a>
    </p>
    <div class="warning">
      <strong>Did not request this?</strong> You can safely ignore this email. Your password will not change.
    </div>
    <p style="font-size: 13px; color: #6b7280;">This link expires in 1 hour.</p>
    `,
  );
}

// ── Payment Confirmation ────────────────────────────────────

export function paymentConfirmationTemplate(
  data: EmailTemplateData & {
    amount: string;
    currency: string;
    propertyAddress: string;
    paymentDate: string;
    transactionId: string;
  },
): string {
  return wrapInLayout(
    'Payment Confirmed',
    `
    <h2>Payment Received</h2>
    <p>Your rent payment has been successfully processed.</p>
    <div class="highlight">
      <p class="amount">${data.currency} ${data.amount}</p>
      <p style="margin: 4px 0; font-size: 14px; color: #6b7280;">Property: ${data.propertyAddress}</p>
      <p style="margin: 4px 0; font-size: 14px; color: #6b7280;">Date: ${data.paymentDate}</p>
      <p style="margin: 4px 0; font-size: 14px; color: #6b7280;">Transaction: ${data.transactionId}</p>
    </div>
    <p>Thank you for your prompt payment.</p>
    `,
  );
}

// ── Rent Reminder ───────────────────────────────────────────

export function rentReminderTemplate(
  data: EmailTemplateData & {
    amount: string;
    currency: string;
    dueDate: string;
    daysUntilDue: number;
    propertyAddress?: string;
  },
): string {
  const urgency =
    data.daysUntilDue < 0
      ? `<div class="warning"><strong>Your payment is ${Math.abs(data.daysUntilDue)} day(s) overdue.</strong> Please pay as soon as possible to avoid late fees.</div>`
      : data.daysUntilDue === 0
        ? `<div class="warning"><strong>Your rent payment is due today.</strong></div>`
        : `<p>This is a friendly reminder that your rent payment is due in <strong>${data.daysUntilDue} day(s)</strong>.</p>`;

  return wrapInLayout(
    'Rent Payment Reminder',
    `
    <h2>Rent Payment Reminder</h2>
    ${urgency}
    <div class="highlight">
      <p class="amount">${data.currency} ${data.amount}</p>
      <p style="margin: 4px 0; font-size: 14px; color: #6b7280;">Due Date: ${data.dueDate}</p>
      ${data.propertyAddress ? `<p style="margin: 4px 0; font-size: 14px; color: #6b7280;">Property: ${data.propertyAddress}</p>` : ''}
    </div>
    <p>Please ensure your payment is made on time to maintain your good standing.</p>
    `,
  );
}

// ── KYC Status Update ───────────────────────────────────────

export function kycStatusUpdateTemplate(
  data: EmailTemplateData & {
    status: 'approved' | 'rejected' | 'pending';
    reason?: string;
  },
): string {
  const statusMap = {
    approved: { color: '#10b981', label: 'Approved', icon: '✅' },
    rejected: { color: '#ef4444', label: 'Rejected', icon: '❌' },
    pending: { color: '#f59e0b', label: 'Under Review', icon: '⏳' },
  };

  const s = statusMap[data.status];

  return wrapInLayout(
    'KYC Verification Update',
    `
    <h2>Identity Verification Update</h2>
    <p>Your KYC verification status has been updated:</p>
    <div class="highlight">
      <p style="font-size: 20px; font-weight: 700; color: ${s.color};">${s.icon} ${s.label}</p>
      ${data.reason ? `<p style="margin: 4px 0; font-size: 14px; color: #6b7280;">Reason: ${data.reason}</p>` : ''}
    </div>
    ${data.status === 'rejected' ? '<p>Please update your documents and resubmit for verification.</p>' : ''}
    ${data.status === 'approved' ? '<p>You now have full access to all Chioma features.</p>' : ''}
    `,
  );
}
