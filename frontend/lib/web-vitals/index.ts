export {
  CORE_WEB_VITAL_NAMES,
  isCoreWebVitalName,
  type CoreWebVitalName,
  type RawWebVitalMetric,
  type WebVitalName,
  type WebVitalPayload,
  type WebVitalRating,
} from './types';
export { sanitizeRoute, toWebVitalPayload } from './sanitize';
export { reportWebVital, setWebVitalSink, type WebVitalSink } from './report';
