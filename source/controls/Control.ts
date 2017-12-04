import {EventHandler, sGisEvent} from "../EventHandler";
import {Map} from "../Map";
import {FeatureLayer} from "../FeatureLayer";
import {ISnappingProvider} from "./snapping/ISnappingProvider";
import {Contour, Coordinates} from "../baseTypes";
import {PointFeature} from "../features/Point";
import {CrossPointSymbol} from "../symbols/point/CrossPointSymbol";
import {Symbol} from "../symbols/Symbol";
import {Feature} from "../features/Feature";

/**
 * Drawing of a new feature is started. When this event is fired, the control will have a new feature as its .activeFeature property.
 * @event DrawingBeginEvent
 */
export class DrawingBeginEvent extends sGisEvent {
    static type: string = 'drawingBegin';

    constructor() {
        super(DrawingBeginEvent.type);
    }
}

/**
 * Drawing of the current feature is finished.
 * @event DrawingFinishEvent
 */
export class DrawingFinishEvent extends sGisEvent {
    static type: string = 'drawingFinish';

    /**
     * The feature that was created.
     */
    readonly feature: Feature;

    /**
     * Browser mouse event that triggered the event.
     */
    readonly browserEvent: MouseEvent;

    constructor(feature: Feature, browserEvent: MouseEvent) {
        super(DrawingFinishEvent.type);
        this.feature = feature;
        this.browserEvent = browserEvent;
    }
}

export interface ControlConstructorParams {
    /** @see [[Control.useTempLayer]] */
    useTempLayer?: boolean,
    /** @see [[Control.snappingProvider]] */
    snappingProvider?: ISnappingProvider,
    /** @see [[Control.activeLayer]] */
    activeLayer?: FeatureLayer
}

/**
 * Base class of all controls. Controls are objects that provide methods for setting interactions between user and map.
 * @alias sGis.Control
 */
export abstract class Control extends EventHandler {
    private _map: Map;
    private _snappingFeature: PointFeature;
    private _snappingSymbol: Symbol = new CrossPointSymbol();

    protected _isActive: boolean = false;

    /**
     * Temporary feature layer that is added to the map when the control is activated. It is used to show snapping point
     * and can be used as a temporary storage for features the control works with.
     */
    protected _tempLayer: FeatureLayer | null = null;

    /**
     * If set to true, when activated the control will create a temporary feature layer and add in to the map. When
     * control is deactivated, the layer is removed.
     */
    useTempLayer: boolean = false;

    /**
     * Snapping provider to be used by the control. If set to null, the snapping will not be used.
     * @see [[Control._snap]]
     */
    snappingProvider: ISnappingProvider | null = null;

    /**
     * Vector layer the control will work with. Some controls do not require active layer to be set.
     */
    activeLayer: FeatureLayer | null = null;

    /**
     * @param map - map the control will work with.
     * @param __namedParameters - key-value set of properties to be set to the instance
     */
    constructor(map: Map, {useTempLayer = false, snappingProvider = null, activeLayer = null}: ControlConstructorParams = {}) {
        super();
        this._map = map;
        this.useTempLayer = useTempLayer;
        this.snappingProvider = snappingProvider;
        this.activeLayer = activeLayer;
    }

    /**
     * Makes the control active.
     */
    activate(): void {
        this.isActive = true;
    }

    /**
     * Makes the control inactive.
     */
    deactivate(): void {
        this.isActive = false;
    }

    /**
     * This method is called after base procedures for control activation are complete. Child class should set
     * the event listeners here and make all other necessary preparations.
     */
    protected abstract _activate(): void;

    /**
     * This method is called after base procedures for control deactivation are complete. Child class should remove
     * its event listeners here.
     */
    protected abstract _deactivate(): void;

    /**
     * Active status of the control.
     */
    get isActive(): boolean { return this._isActive; }
    set isActive(bool: boolean) {
        if (!this._map || this._isActive === bool) return;
        this._isActive = bool;

        if (bool) {
            if (this.useTempLayer) {
                this._tempLayer = new FeatureLayer();
                this._map.addLayer(this._tempLayer);
            }
            this._activate();
        } else {
            this._deactivate();
            if (this._map.contains(this._tempLayer)) {
                this._map.removeLayer(this._tempLayer);
            }
            this._tempLayer = null;
        }
    }

    /**
     * Using the provider set in .snappingProvider property, this method searches for snapping point based on given
     * parameters. If such a point is found, it adds the snapping feature to the tempLayer (if temp layer is used).
     * Then it returns the position of the snapping point as a return value.
     * If no snapping point was found, it clears the snapping feature and removes the original coordinates.
     * @param point - base point that should be snapped.
     * @param isAltPressed - whether alt key is pressed (to cancel snapping).
     * @param activeContour - active contour of the feature. This is used for axis and orthogonal snapping methods.
     * @param activeIndex - index of the active point in the contour. This is used for axis and orthogonal snapping methods.
     * @param isPolygon - specifies whether the contour should be treated as enclosed (meaning, that last and first
     *                    points should be connected.
     */
    protected _snap(point: Coordinates, isAltPressed: boolean, activeContour?: Contour, activeIndex?: number, isPolygon?: boolean): Coordinates {
        let snappingPoint = null;
        if (!isAltPressed && this.snappingProvider) {
            snappingPoint = this.snappingProvider.getSnappingPoint(point, activeContour, activeIndex, isPolygon);
        }

        if (this._tempLayer) {
            const snappingFeature = this._getSnappingFeature(snappingPoint);
            if (snappingPoint && !this._tempLayer.has(snappingFeature)) {
                this._tempLayer.add(snappingFeature);
            } else if (!snappingPoint && this._tempLayer.has(snappingFeature)) {
                this._tempLayer.remove(snappingFeature);
            }
            this._tempLayer.redraw();
        }

        return snappingPoint || point;
    }

    /**
     * Removes snapping point from the temp layer.
     */
    protected _unsnap(): void {
        if (this._tempLayer && this._snappingFeature && this._tempLayer.has(this._snappingFeature)) {
            this._tempLayer.remove(this._snappingFeature);
        }
    }

    private _getSnappingFeature(point: Coordinates | null): PointFeature {
        if (!this._snappingFeature) {
            this._snappingFeature = new PointFeature([0, 0], {crs: this._map.crs, symbol: this._snappingSymbol});
        }

        if (point) {
            this._snappingFeature.position = point;
        }

        return this._snappingFeature;
    }

    /**
     * Map the control works with.
     */
    get map(): Map { return this._map; }
}