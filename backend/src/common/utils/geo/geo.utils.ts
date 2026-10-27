const EARTH_RADIUS_KM = 6371;
const KM_PER_DEGREE_LATITUDE = (Math.PI * EARTH_RADIUS_KM) / 180;

export interface GeoBoundingBox {
  minLat: number;
  maxLat: number;
  /** Undefined when the box touches a pole or crosses the antimeridian. */
  minLng?: number;
  maxLng?: number;
}

export class GeoUtils {
  /**
   * Compute a lat/lng bounding box that fully contains the circle of
   * `radiusKm` around (lat, lng).
   *
   * Used as a sargable prefilter (`latitude BETWEEN ... AND longitude
   * BETWEEN ...`) in front of the exact Haversine check, so the planner can
   * use the `(status, latitude, longitude, price)` index instead of
   * evaluating trigonometry for every row in the table.
   *
   * The longitude bounds are omitted when the box would reach a pole or wrap
   * around the antimeridian; the latitude bounds alone are still correct and
   * the Haversine predicate remains the source of truth.
   */
  static boundingBox(
    lat: number,
    lng: number,
    radiusKm: number,
  ): GeoBoundingBox {
    const latDelta = radiusKm / KM_PER_DEGREE_LATITUDE;
    const minLat = Math.max(lat - latDelta, -90);
    const maxLat = Math.min(lat + latDelta, 90);

    if (minLat <= -90 || maxLat >= 90) {
      return { minLat, maxLat };
    }

    const widestLat = Math.max(Math.abs(minLat), Math.abs(maxLat));
    const lngDelta = latDelta / Math.cos((widestLat * Math.PI) / 180);
    const minLng = lng - lngDelta;
    const maxLng = lng + lngDelta;

    if (minLng < -180 || maxLng > 180) {
      return { minLat, maxLat };
    }

    return { minLat, maxLat, minLng, maxLng };
  }
}
