# Backend-Frontend Integration Guide

## Phase 1: Core Infrastructure & Notifications

This document outlines the initial phase of integrating the Chioma frontend with the existing backend services.

## What's Been Implemented

### 1. Centralized API Client (`lib/api-client.ts`)

A robust HTTP client with the following features:

- **Automatic Authentication**: Injects JWT tokens from localStorage
- **Error Handling**: Handles 401 errors with automatic redirect to login
- **Retry Logic**: Automatically retries failed requests with exponential backoff
- **Type Safety**: Full TypeScript support for all API calls
- **Interceptors**: Request/response interceptors for logging and error handling

#### Usage Example:

```typescript
import { apiClient } from '@/lib/api-client';

// GET request
const response = await apiClient.get<User[]>('/users');

// POST request
const newUser = await apiClient.post<User>('/users', {
  email: 'user@example.com',
  name: 'John Doe'
});

// PUT request
const updated = await apiClient.put<User>(`/users/${id}`, userData);

// DELETE request
await apiClient.delete(`/users/${id}`);
```

### 2. Type Definitions (`types/`)

Complete TypeScript interfaces matching backend entities:

- **User**: User profiles and authentication
- **Property**: Property listings and details
- **RentalAgreement**: Rental agreements and contracts
- **Payment**: Payment transactions and history
- **MaintenanceRequest**: Maintenance requests and tracking
- **Dispute**: Dispute resolution system
- **Notification**: Notification system
- **AuditLog**: Audit trail and activity logs
- **Transaction**: Financial transactions

### 3. Notification Service (`lib/services/notification.service.ts`)

Complete notification management:

- Get all notifications with filtering
- Get unread notification count
- Mark notifications as read (single or all)
- Delete notifications
- Clear all notifications

#### Usage Example:

```typescript
import { notificationService } from '@/lib/services/notification.service';

// Get all notifications
const notifications = await notificationService.getNotifications();

// Get unread notifications only
const unread = await notificationService.getNotifications({ isRead: false });

// Get unread count
const count = await notificationService.getUnreadCount();

// Mark as read
await notificationService.markAsRead(notificationId);

// Mark all as read
await notificationService.markAllAsRead();
```

### 4. Notification Center UI (`components/NotificationCenter.tsx`)

A fully functional notification center with:

- **Real-time Updates**: Polls for new notifications every 30 seconds
- **Unread Badge**: Shows unread count on bell icon
- **Filtering**: Filter by all or unread notifications
- **Mark as Read**: Individual or bulk mark as read
- **Delete**: Remove individual notifications
- **Time Formatting**: Human-readable time stamps (e.g., "5m ago", "2h ago")
- **Type Icons**: Different icons for different notification types
- **Responsive Design**: Works on all screen sizes

#### Integration:

```typescript
import NotificationCenter from '@/components/NotificationCenter';

// Add to your navbar or header
<NotificationCenter />
```

## Backend Endpoints Required

For the notification system to work, the backend needs these endpoints:

```
GET    /notifications              - Get all notifications
GET    /notifications/unread/count - Get unread count
PATCH  /notifications/:id/read     - Mark notification as read
PATCH  /notifications/read-all     - Mark all as read
DELETE /notifications/:id          - Delete notification
DELETE /notifications/clear-all    - Clear all notifications
```

## Environment Variables

Add to your `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Next Steps (Phase 2)

### High Priority Integrations:

1. **Real-time WebSocket Integration**
   - Live notification delivery
   - Real-time messaging
   - Live status updates

2. **Disputes Module**
   - Dispute listing and details
   - Evidence upload
   - Resolution workflow

3. **Enhanced Property Management**
   - Advanced search and filtering
   - Property analytics
   - Bulk operations

4. **Payment Integration**
   - Transaction history
   - Payment processing
   - Financial reports

5. **Maintenance Requests**
   - Request creation and tracking
   - Status updates
   - Assignment workflow

### Medium Priority:

6. **Audit Trail Visibility**
   - Activity logs
   - Change history
   - Security events

7. **User Profile Enhancement**
   - Complete profile management
   - KYC integration
   - Preference settings

8. **Messaging System**
   - Real-time chat
   - Message history
   - File sharing

### Lower Priority:

9. **Reviews & Ratings**
   - Property reviews
   - User ratings
   - Review moderation

10. **Webhooks Integration**
    - Webhook event handling
    - Event subscriptions
    - Webhook logs

## Testing

### Unit Tests

```bash
npm run test
```

### Integration Tests

```bash
npm run test:integration
```

### E2E Tests

```bash
npm run test:e2e
```

## Performance Considerations

- **Caching**: Implement React Query or SWR for data caching
- **Pagination**: Use pagination for large datasets
- **Lazy Loading**: Lazy load components and routes
- **Code Splitting**: Split code by route
- **Image Optimization**: Use Next.js Image component

## Security Best Practices

- **Token Storage**: Store JWT in httpOnly cookies (not localStorage)
- **CSRF Protection**: Implement CSRF tokens
- **Input Validation**: Validate all user inputs
- **XSS Prevention**: Sanitize user-generated content
- **Rate Limiting**: Implement rate limiting on API calls

## Contributing

When adding new integrations:

1. Create type definitions in `types/`
2. Create service in `lib/services/`
3. Create UI components in `components/`
4. Update this documentation
5. Add tests
6. Create PR with detailed description

## Support

For questions or issues:
- Check backend API documentation
- Review this integration guide
- Contact the development team
