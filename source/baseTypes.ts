/**
 * A pair of coordinates, usually [x, y] or [lon, lat].
 */
export type Coordinates = [number, number];

/**
 * A set of coordinate pairs that represent a set of points (form multipoint features), a polyline or a contour of a polygon.
 */
export type Contour = Coordinates[];

/**
 * Minimum and maximum resolutions respectively at which a layer (or a set of layers) should be displayed.
 * If either value is negative (usually -1) that limit is not applied. Second value, if positive, must always be
 * greater than the first one.
 */
export type ResolutionLimits = [number, number];
