export function simplifyFeature(feature, tolerance) {
  if (!feature?.geometry) {
    return feature;
  }

  return {
    ...feature,
    geometry: simplifyGeometry(feature.geometry, tolerance)
  };
}

export function simplifyGeometry(geometry, tolerance) {
  if (geometry.type === "Polygon") {
    const polygon = simplifyPolygon(geometry.coordinates, tolerance);
    return { ...geometry, coordinates: polygon || [] };
  }

  if (geometry.type === "MultiPolygon") {
    const polygons = geometry.coordinates
      .map((polygon) => simplifyPolygon(polygon, tolerance))
      .filter(Boolean);
    return { ...geometry, coordinates: polygons };
  }

  return geometry;
}

export function simplifyPolygon(polygon, tolerance) {
  const outer = simplifyRing(polygon[0], tolerance);

  if (!outer) {
    return null;
  }

  const holes = polygon.slice(1).map((ring) => simplifyRing(ring, tolerance)).filter(Boolean);

  return [outer, ...holes];
}

export function simplifyRing(ring, tolerance) {
  if (!Array.isArray(ring) || ring.length <= 8) {
    return ring;
  }

  const simplified = simplifyLine(ring, tolerance);

  return simplified.length >= 4 ? simplified : null;
}

export function simplifyLine(points, tolerance) {
  if (points.length <= 2) {
    return points.slice();
  }

  const keep = new Uint8Array(points.length);
  const segments = [[0, points.length - 1]];
  keep[0] = 1;
  keep[points.length - 1] = 1;

  while (segments.length) {
    const [start, end] = segments.pop();
    let maxDistance = 0;
    let maxIndex = 0;

    for (let index = start + 1; index < end; index += 1) {
      const distance = perpendicularDistance(points[index], points[start], points[end]);

      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = index;
      }
    }

    if (maxDistance > tolerance) {
      keep[maxIndex] = 1;
      segments.push([maxIndex, end], [start, maxIndex]);
    }
  }

  return points.filter((_, index) => keep[index]);
}

export function perpendicularDistance(point, lineStart, lineEnd) {
  const [x, y] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;
  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) {
    return Math.hypot(x - x1, y - y1);
  }

  return Math.abs(dy * x - dx * y + x2 * y1 - y2 * x1) / Math.hypot(dx, dy);
}
