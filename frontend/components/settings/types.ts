export type ThemePreference = 'light' | 'dark' | 'system';

export interface NotificationPreferences {
  email: {
    newPropertyMatches: boolean;
    paymentReminders: boolean;
    maintenanceUpdates: boolean;
  };
  push: {
    newMessages: boolean;
    criticalAlerts: boolean;
  };
  inAppSummary: boolean;
}

export interface UserPreferences {
  notifications: NotificationPreferences;
  appearanceTheme: ThemePreference;
  language: string;
  currency: string;
}

export interface MfaSetupPayload {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}
