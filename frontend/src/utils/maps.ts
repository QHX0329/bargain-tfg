export interface LatLng {
  lat: number;
  lng: number;
}

export type TravelMode = "driving" | "walking" | "bicycling" | "transit";

function isValidLatLng(point: LatLng): boolean {
  return (
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    point.lat >= -90 &&
    point.lat <= 90 &&
    point.lng >= -180 &&
    point.lng <= 180
  );
}

function formatPoint(point: LatLng): string {
  return `${point.lat.toFixed(6)},${point.lng.toFixed(6)}`;
}

function getValidStops(stops: LatLng[]): LatLng[] {
  return stops.filter(isValidLatLng);
}

function buildDaddrPath(origin: LatLng, stops: LatLng[]): string {
  return [...stops, origin].map(formatPoint).join("+to:");
}

function toAppleDirFlag(mode: TravelMode): "d" | "w" | "r" {
  if (mode === "walking") {
    return "w";
  }
  if (mode === "transit") {
    return "r";
  }
  return "d";
}

export function buildGoogleMapsCircularRouteUrl(params: {
  origin: LatLng;
  stops: LatLng[];
  travelMode?: TravelMode;
}): string | null {
  const { origin, stops, travelMode = "driving" } = params;

  if (!isValidLatLng(origin)) {
    return null;
  }

  const validStops = getValidStops(stops);
  if (validStops.length === 0) {
    return null;
  }

  const originQuery = formatPoint(origin);
  const urlParams = new URLSearchParams({
    api: "1",
    origin: originQuery,
    destination: originQuery,
    travelmode: travelMode,
  });

  urlParams.set("waypoints", validStops.map(formatPoint).join("|"));

  return `https://www.google.com/maps/dir/?${urlParams.toString()}`;
}

export function buildGoogleMapsAppCircularRouteUrl(params: {
  origin: LatLng;
  stops: LatLng[];
  travelMode?: TravelMode;
}): string | null {
  const { origin, stops, travelMode = "driving" } = params;

  if (!isValidLatLng(origin)) {
    return null;
  }

  const validStops = getValidStops(stops);
  if (validStops.length === 0) {
    return null;
  }

  const urlParams = new URLSearchParams({
    saddr: formatPoint(origin),
    daddr: buildDaddrPath(origin, validStops),
    directionsmode: travelMode,
  });

  return `comgooglemaps://?${urlParams.toString()}`;
}

export function buildAppleMapsCircularRouteUrl(params: {
  origin: LatLng;
  stops: LatLng[];
  travelMode?: TravelMode;
}): string | null {
  const { origin, stops, travelMode = "driving" } = params;

  if (!isValidLatLng(origin)) {
    return null;
  }

  const validStops = getValidStops(stops);
  if (validStops.length === 0) {
    return null;
  }

  const urlParams = new URLSearchParams({
    saddr: formatPoint(origin),
    daddr: buildDaddrPath(origin, validStops),
    dirflg: toAppleDirFlag(travelMode),
  });

  return `http://maps.apple.com/?${urlParams.toString()}`;
}