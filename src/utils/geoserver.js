export const GeometryType = {
  POINT: 'Point',
  MULTI_POINT: 'MultiPoint',
  LINE_STRING: 'LineString',
  MULTI_LINE_STRING: 'MultiLineString',
  POLYGON: 'Polygon',
  MULTI_POLYGON: 'MultiPolygon'
}

export const getGeometryType = (geoJsonGeometry) => {
  if (!geoJsonGeometry || !geoJsonGeometry.type) {
    return null
  }
  return geoJsonGeometry.type
}

export const isPointType = (geometryType) => {
  return geometryType === GeometryType.POINT || geometryType === GeometryType.MULTI_POINT
}

export const isLineType = (geometryType) => {
  return (
    geometryType === GeometryType.LINE_STRING || geometryType === GeometryType.MULTI_LINE_STRING
  )
}

export const isPolygonType = (geometryType) => {
  return geometryType === GeometryType.POLYGON || geometryType === GeometryType.MULTI_POLYGON
}

export const convertGeoJsonToAMap = (geoJson, AMap) => {
  if (!geoJson || !AMap) {
    return null
  }

  const { type, coordinates } = geoJson

  switch (type) {
    case GeometryType.POINT:
      return new AMap.LngLat(coordinates[0], coordinates[1])

    case GeometryType.MULTI_POINT:
      return coordinates.map((coord) => new AMap.LngLat(coord[0], coord[1]))

    case GeometryType.LINE_STRING:
      return coordinates.map((coord) => new AMap.LngLat(coord[0], coord[1]))

    case GeometryType.MULTI_LINE_STRING:
      return coordinates.map((line) => line.map((coord) => new AMap.LngLat(coord[0], coord[1])))

    case GeometryType.POLYGON:
      return coordinates.map((ring) => ring.map((coord) => new AMap.LngLat(coord[0], coord[1])))

    case GeometryType.MULTI_POLYGON:
      return coordinates.map((polygon) =>
        polygon.map((ring) => ring.map((coord) => new AMap.LngLat(coord[0], coord[1])))
      )

    default:
      console.warn('不支持的几何类型:', type)
      return null
  }
}

export const getDefaultStyle = (geometryType) => {
  const defaultStyles = {
    Point: {
      color: '#1890ff',
      size: 8,
      opacity: 0.8
    },
    LineString: {
      color: '#52c41a',
      width: 3,
      opacity: 1
    },
    Polygon: {
      fillColor: '#1890ff',
      fillOpacity: 0.3,
      strokeColor: '#1890ff',
      strokeWeight: 2,
      strokeOpacity: 1
    }
  }

  return defaultStyles[geometryType] || defaultStyles.Point
}

export const validateGeoJson = (data) => {
  if (!data) {
    return { valid: false, error: '数据为空' }
  }

  if (data.type !== 'FeatureCollection' && data.type !== 'Feature') {
    return { valid: false, error: '不是有效的GeoJSON格式' }
  }

  if (data.type === 'FeatureCollection') {
    if (!Array.isArray(data.features)) {
      return { valid: false, error: 'FeatureCollection缺少features数组' }
    }
  }

  return { valid: true, error: null }
}

export const calculateBounds = (geoJsonData) => {
  if (!geoJsonData || !geoJsonData.features || geoJsonData.features.length === 0) {
    return null
  }

  let minLng = Infinity
  let maxLng = -Infinity
  let minLat = Infinity
  let maxLat = -Infinity

  const processCoordinates = (coords) => {
    if (typeof coords[0] === 'number') {
      minLng = Math.min(minLng, coords[0])
      maxLng = Math.max(maxLng, coords[0])
      minLat = Math.min(minLat, coords[1])
      maxLat = Math.max(maxLat, coords[1])
    } else {
      coords.forEach((coord) => processCoordinates(coord))
    }
  }

  geoJsonData.features.forEach((feature) => {
    if (feature.geometry && feature.geometry.coordinates) {
      processCoordinates(feature.geometry.coordinates)
    }
  })

  if (minLng === Infinity) return null

  return {
    minLng,
    maxLng,
    minLat,
    maxLat,
    center: [(minLng + maxLng) / 2, (minLat + maxLat) / 2]
  }
}
