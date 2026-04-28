# Data Archival and Deletion Implementation

## Overview

This document describes the implementation of the data archival and deletion system for handling old data in compliance with retention policies and GDPR requirements.

## Features

### Automated Archival

- **Scheduled Processing**: Runs daily at midnight to automatically archive old data
- **Configurable Retention**: Different retention periods for different data types
- **Soft Delete Support**: Option to soft delete or hard delete archived records
- **Archive Tables**: Separate archive tables with metadata for audit purposes

### Data Types Supported

1. **Tenant Screening Requests** (7 years retention)
2. **Tenant Screening Reports** (7 years retention)
3. **Tenant Screening Consent** (1 year retention)

### Manual Operations

- **Manual Archival**: Trigger archival for specific entity types
- **Custom Retention**: Override default retention periods
- **Statistics**: View archival statistics and system health

## Implementation Details

### Core Components

#### DataArchivalService

```typescript
@Injectable()
export class DataArchivalService {
  // Main archival logic
  async performScheduledArchival(): Promise<void>;
  async archiveEntityData(
    entityType: string,
    config: ArchivalConfig,
  ): Promise<ArchivalStats>;
  async manualArchive(
    entityType: string,
    olderThanDays?: number,
  ): Promise<ArchivalStats>;
}
```

#### DataArchivalController

```typescript
@Controller('data-archival')
export class DataArchivalController {
  @Get('stats')
  async getArchivalStats()

  @Post('manual-archive')
  async manualArchive(@Body() dto: ManualArchiveDto)

  @Post('trigger-scheduled')
  async triggerScheduledArchival()
}
```

### Configuration

```typescript
const archivalConfigs = {
  tenant_screening_requests: {
    retentionDays: 2555, // 7 years
    archiveTable: "archived_tenant_screening_requests",
    softDelete: true,
  },
  // ... other configurations
};
```

### Archive Table Structure

Archive tables include:

- All original columns from source table
- `archived_at`: Timestamp when record was archived
- `archival_reason`: Reason for archival (e.g., 'retention_policy')

### Error Handling

- **Graceful Degradation**: Continues processing other entities if one fails
- **Transaction Safety**: Each archival operation runs in a database transaction
- **Logging**: Comprehensive logging for monitoring and debugging

## Usage

### Monitoring

```bash
# Get archival statistics
curl GET /api/data-archival/stats

# Response includes:
{
  "tenant_screening_requests": {
    "activeRecords": 1234,
    "archivedRecords": 5678,
    "retentionDays": 2555,
    "archiveTable": "archived_tenant_screening_requests"
  }
}
```

### Manual Operations

```bash
# Archive specific entity type
curl POST /api/data-archival/manual-archive \
  -H "Content-Type: application/json" \
  -d '{"entityType": "tenant_screening_requests", "olderThanDays": 30}'

# Trigger scheduled archival
curl POST /api/data-archival/trigger-scheduled
```

## Security Considerations

- **Access Control**: Only authorized users can trigger manual archival
- **Audit Trail**: All archival operations are logged
- **Data Encryption**: Sensitive data remains encrypted in archive tables
- **Retention Compliance**: Follows legal requirements for data retention

## Performance

- **Batch Processing**: Processes records in batches of 1000
- **Index Optimization**: Archive tables include appropriate indexes
- **Background Processing**: Scheduled jobs run in background
- **Resource Monitoring**: Tracks processing time and resource usage

## Testing

Comprehensive test coverage includes:

- Unit tests for all service methods
- Integration tests with database
- Error scenario testing
- Performance testing under load

## Deployment

### Environment Variables

```bash
# Database configuration
DATABASE_URL=postgresql://user:pass@localhost/db

# Archival settings
ARCHIVAL_ENABLED=true
ARCHIVAL_SCHEDULE="0 0 * * *" # Daily at midnight
```

### Database Migrations

Archive tables are created automatically with the following schema:

```sql
CREATE TABLE archived_tenant_screening_requests AS
SELECT * FROM tenant_screening_requests WHERE 1=0;

ALTER TABLE archived_tenant_screening_requests
ADD COLUMN archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN archival_reason VARCHAR(100) DEFAULT 'retention_policy';
```

## Monitoring and Alerts

### Metrics to Monitor

- Number of records archived per day
- Processing duration
- Error rates
- Database storage usage

### Alert Conditions

- Archival process failures
- High error rates (>5%)
- Processing duration >30 minutes
- Storage capacity warnings

## Compliance

### GDPR Compliance

- **Right to be Forgotten**: Hard delete option available
- **Data Portability**: Archive format supports data export
- **Retention Policies**: Configurable retention periods
- **Audit Logs**: Complete audit trail of all operations

### Legal Requirements

- **Financial Records**: 7-year retention for screening data
- **Consent Records**: 1-year retention for consent data
- **Audit Requirements**: All operations logged with timestamps

## Future Enhancements

1. **Multi-Region Support**: Archive data across multiple regions
2. **Compression**: Compress archived data to save storage
3. **Cold Storage**: Move old archives to cold storage
4. **Data Analytics**: Analyze archived data patterns
5. **Automated Cleanup**: Clean up very old archive data

## Troubleshooting

### Common Issues

1. **Archive Table Creation Fails**
   - Check database permissions
   - Verify table doesn't already exist

2. **Slow Performance**
   - Check database indexes
   - Reduce batch size
   - Monitor database connections

3. **Memory Issues**
   - Reduce batch size
   - Monitor memory usage
   - Check for memory leaks

### Debug Commands

```bash
# Check archival logs
grep "DataArchivalService" /var/log/app.log

# Monitor database connections
psql -c "SELECT * FROM pg_stat_activity;"

# Check table sizes
psql -c "\dt+ archived_*"
```
