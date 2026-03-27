# Backend Dependency Graph

## Circular Dependency Status

Current backend service graph no longer uses `forwardRef`.

Resolved paths:

- `KycService -> UserKycStatusService`
  Previous shape coupled KYC flow to the broader `UsersService`.
- `AgreementsService -> ReviewPromptService`
  `ReviewsModule` no longer imports `AgreementsModule`.
- `MaintenanceService -> ReviewPromptService`
  `ReviewsModule` no longer imports `MaintenanceModule`.

## Current Direction

### KYC

```text
KycModule
  -> UsersModule (UserKycStatusService only)
  -> SecurityModule
  -> AuditModule
```

### Reviews

```text
AgreementsModule -> ReviewsModule
MaintenanceModule -> ReviewsModule
ReviewsModule -> ReviewPromptService
```

### Screening

```text
ScreeningModule
  -> SecurityModule
  -> NotificationsModule
  -> AuditModule
  -> WebhooksModule
```

## Guidance

- prefer narrow, task-specific services over broad service-to-service coupling
- keep provider callback logic behind module-local services and guards
- avoid reintroducing bidirectional module imports for prompting or notifications
