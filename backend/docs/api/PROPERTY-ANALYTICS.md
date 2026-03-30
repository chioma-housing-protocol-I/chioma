# Property Analytics API

## Endpoint

- Method: `GET`
- Path: `/analytics/landlord/dashboard`
- Auth: Bearer JWT required

## Query Parameters

- `days` (optional, number): trend range in days. Allowed range is `1..365`. Default is `30`.

## Response Shape

```json
{
  "generatedAt": "2026-03-30T10:00:00.000Z",
  "range": {
    "days": 30,
    "startDate": "2026-03-01T00:00:00.000Z",
    "endDate": "2026-03-30T10:00:00.000Z"
  },
  "summary": {
    "totalProperties": 12,
    "publishedProperties": 9,
    "totalViews": 3870,
    "totalFavorites": 740,
    "totalInquiries": 280,
    "conversionRate": 7.24
  },
  "performance": {
    "averageViewsPerProperty": 322.5,
    "averageInquiriesPerProperty": 23.33,
    "inquiryResponseRate": 81.67,
    "favoriteToViewRate": 19.12
  },
  "topPerformingProperties": [
    {
      "propertyId": "uuid",
      "title": "Ocean View Penthouse",
      "city": "Lagos",
      "status": "published",
      "viewCount": 910,
      "favoriteCount": 210,
      "inquiryCount": 66,
      "conversionRate": 7.25
    }
  ],
  "marketTrends": {
    "inquiryTrend": [
      {
        "date": "2026-03-01",
        "inquiries": 8
      }
    ],
    "listingStatusDistribution": [
      {
        "status": "published",
        "count": 9,
        "percentage": 75
      }
    ],
    "cityTrends": [
      {
        "city": "Lagos",
        "propertyCount": 6,
        "totalViews": 2600,
        "totalFavorites": 510,
        "totalInquiries": 192,
        "averageViewsPerProperty": 433.33
      }
    ]
  }
}
```

## Notes

- View and favorite data are sourced from property counters.
- Inquiry trend is computed from inquiry records within the selected range.
- Endpoint is designed for landlord dashboard polling (near real-time refresh).
