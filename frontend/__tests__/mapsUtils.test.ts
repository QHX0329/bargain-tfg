import {
  buildAppleMapsCircularRouteUrl,
  buildGoogleMapsAppCircularRouteUrl,
  buildGoogleMapsCircularRouteUrl,
} from "../src/utils/maps";

describe("maps utils - buildGoogleMapsCircularRouteUrl", () => {
  it("builds a circular route url with origin, destination and waypoints", () => {
    const url = buildGoogleMapsCircularRouteUrl({
      origin: { lat: 37.3886, lng: -5.9823 },
      stops: [
        { lat: 37.3812, lng: -5.9701 },
        { lat: 37.3945, lng: -5.9872 },
      ],
    });

    expect(url).not.toBeNull();

    const parsed = new URL(url as string);
    expect(parsed.origin).toBe("https://www.google.com");
    expect(parsed.pathname).toBe("/maps/dir/");
    expect(parsed.searchParams.get("api")).toBe("1");
    expect(parsed.searchParams.get("travelmode")).toBe("driving");
    expect(parsed.searchParams.get("origin")).toBe("37.388600,-5.982300");
    expect(parsed.searchParams.get("destination")).toBe("37.388600,-5.982300");
    expect(parsed.searchParams.get("waypoints")).toBe(
      "37.381200,-5.970100|37.394500,-5.987200",
    );
  });

  it("returns null when route has no valid stops", () => {
    const url = buildGoogleMapsCircularRouteUrl({
      origin: { lat: 37.3886, lng: -5.9823 },
      stops: [
        { lat: 120, lng: -5.97 },
        { lat: NaN, lng: -5.98 },
      ],
    });

    expect(url).toBeNull();
  });

  it("filters invalid stops and keeps valid ones", () => {
    const url = buildGoogleMapsCircularRouteUrl({
      origin: { lat: 37.3886, lng: -5.9823 },
      stops: [
        { lat: 91, lng: 0 },
        { lat: 37.4011, lng: -5.9912 },
      ],
      travelMode: "walking",
    });

    expect(url).not.toBeNull();
    const parsed = new URL(url as string);
    expect(parsed.searchParams.get("travelmode")).toBe("walking");
    expect(parsed.searchParams.get("waypoints")).toBe("37.401100,-5.991200");
  });
});

describe("maps utils - app url builders", () => {
  it("builds a Google Maps app circular route url", () => {
    const url = buildGoogleMapsAppCircularRouteUrl({
      origin: { lat: 37.3886, lng: -5.9823 },
      stops: [
        { lat: 37.3812, lng: -5.9701 },
        { lat: 37.3945, lng: -5.9872 },
      ],
    });

    expect(url).not.toBeNull();
    const parsed = new URL(url as string);
    expect(parsed.protocol).toBe("comgooglemaps:");
    expect(parsed.searchParams.get("saddr")).toBe("37.388600,-5.982300");
    expect(parsed.searchParams.get("directionsmode")).toBe("driving");
    expect(parsed.searchParams.get("daddr")).toBe(
      "37.381200,-5.970100+to:37.394500,-5.987200+to:37.388600,-5.982300",
    );
  });

  it("builds an Apple Maps fallback circular route url", () => {
    const url = buildAppleMapsCircularRouteUrl({
      origin: { lat: 37.3886, lng: -5.9823 },
      stops: [
        { lat: 37.3812, lng: -5.9701 },
        { lat: 37.3945, lng: -5.9872 },
      ],
      travelMode: "walking",
    });

    expect(url).not.toBeNull();
    const parsed = new URL(url as string);
    expect(parsed.origin).toBe("http://maps.apple.com");
    expect(parsed.searchParams.get("saddr")).toBe("37.388600,-5.982300");
    expect(parsed.searchParams.get("dirflg")).toBe("w");
    expect(parsed.searchParams.get("daddr")).toBe(
      "37.381200,-5.970100+to:37.394500,-5.987200+to:37.388600,-5.982300",
    );
  });
});