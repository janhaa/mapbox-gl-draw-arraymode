import * as turf from '@turf/turf';

const clear = (target, featureIds) => {
  featureIds.forEach((id) => target.deleteFeature(id));
};

const translatePoint = (point, distance, angle) => turf.destination(point, distance, angle)
  .geometry.coordinates;

const makeRectangleAround = (target, centerPoint, width, height, bearing) => {
  const topLeft = translatePoint(translatePoint(centerPoint, width / 2, bearing - 180),
    height / 2, bearing - 90);
  const bottomLeft = translatePoint(translatePoint(centerPoint, width / 2, bearing - 180),
    height / 2, bearing + 90);
  const bottomRight = translatePoint(translatePoint(centerPoint, width / 2, bearing),
    height / 2, bearing + 90);
  const topRight = translatePoint(translatePoint(centerPoint, width / 2, bearing),
    height / 2, bearing - 90);
  const rectCoordinates = [topLeft, bottomLeft, bottomRight, topRight, topLeft];
  const resultingFeature = target.newFeature({
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: rectCoordinates,
    },
  });
  target.addFeature(resultingFeature);
  return resultingFeature;
};

const createArrayFromTo = (target, start, end) => {
  const totalLength = turf.length(turf.lineString([start, end]));
  const bearing = turf.bearing(start, end);

  const gap = 0.00066;
  const width = 0.0019;
  const numPoints = totalLength / (width + gap);

  const numDrawLoop = numPoints - 1;
  const featureIds = [];
  for (let i = 0; i < numDrawLoop; i += 1) {
    const { coordinates } = turf.destination(start,
      (i * totalLength) / numDrawLoop,
      bearing).geometry;
    featureIds.push(makeRectangleAround(target, coordinates,
      width,
      0.004,
      bearing).id);
  }
  return featureIds;
};

export default {
  onSetup() {
    this.updateUIClasses({ mouse: 'add' });
    this.setActionableState({
      trash: true,
    });
    return {
      state: 'chooseFirst',
      firstPoint: null,
      secondPoint: null,
      featureIds: [],
    };
  },
  onMouseMove(state, e) {
    if (state.state === 'chooseSecond') {
      state.secondPoint = [e.lngLat.lng, e.lngLat.lat];
      clear(this, state.featureIds);
      state.featureIds = createArrayFromTo(this, state.firstPoint, state.secondPoint);
    }
  },
  onClick(state, e) {
    if (state.state === 'chooseFirst') {
      state.state = 'chooseSecond';
      state.firstPoint = [e.lngLat.lng, e.lngLat.lat];
    } else if (state.state === 'chooseSecond') {
      state.secondPoint = [e.lngLat.lng, e.lngLat.lat];
      clear(this, state.featureIds);
      state.featureIds = createArrayFromTo(this, state.firstPoint, state.secondPoint);
      this.map.fire('draw.create', {
        features: state.featureIds.map((id) => this.getFeature(id).toGeoJSON()),
      });
      this.changeMode('simple_select');
    }
  },
  toDisplayFeatures(state, geojson, display) {
    display(geojson);
  },
};
