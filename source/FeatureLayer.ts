import {Layer, LayerConstructorParams} from "./Layer";
import {error} from "./utils/utils";
import {Feature} from "./features/Feature";
import {Bbox} from "./Bbox";
import {sGisEvent} from "./EventHandler";

export interface FeatureLayerConstructorParams extends LayerConstructorParams {
    features?: Feature[]
}

/**
 * New features are added to the feature layer
 * @event FeaturesAddEvent
 */
export class FeaturesAddEvent extends sGisEvent {
    static type: string = 'featuresAdd';

    /**
     * Array of features that were added
     */
    readonly features: Feature[];

    constructor(features: Feature[]) {
        super(FeaturesAddEvent.type);
        this.features = features;
    }
}

/**
 * Some features were removed from the feature layer
 * @event FeaturesRemoveEvent
 */
export class FeaturesRemoveEvent extends sGisEvent {
    static type: string = 'featuresRemove';

    /**
     * Array of features that were removed
     */
    readonly features: Feature[];

    constructor(features: Feature[]) {
        super(FeaturesRemoveEvent.type);
        this.features = features;
    }
}

/**
 * A layer that contains arbitrary set of features.
 * @alias sGis.FeatureLayer
 */
export class FeatureLayer extends Layer {
    private _features: Feature[];

    /**
     * @param __namedParameters - properties to be set to the corresponding fields
     * @param extensions - [JS ONLY]additional properties to be copied to the created instance
     */
    constructor({delayedUpdate = true, resolutionLimits, opacity, isDisplayed, features = []}: FeatureLayerConstructorParams = {}, extensions?: Object) {
        super({delayedUpdate, resolutionLimits, opacity, isDisplayed}, extensions);
        this._features = features;
    }

    getFeatures(bbox: Bbox, resolution: number): Feature[] {
        if (!this.checkVisibility(resolution)) return [];

        let obj = [];
        this._features.forEach(feature => {
            if (feature.crs.canProjectTo(bbox.crs) && feature.bbox.intersects(bbox)) obj.push(feature);
        });

        return obj;
    }

    /**
     * Adds a feature or an array of features to the layer
     * @param features - features to add
     * @throws if one of the features is already in the layer
     * @fires FeaturesAddEvent
     */
    add(features: Feature | Feature[]): void {
        const toAdd = Array.isArray(features) ? features : [features];
        if (toAdd.length === 0) return;
        toAdd.forEach(f => {
            if (this._features.indexOf(f) !== -1) error(new Error(`Feature ${f} is already in the layer`));
        });
        this._features = this._features.concat(toAdd);
        this.fire(new FeaturesAddEvent(toAdd));
        this.redraw();
    }

    /**
     * Removes a feature or an array of features from the layer
     * @param features - feature or features to be removed
     * @throws if the one of the features is not in the layer
     * @fires sGis.FeatureLayer#featureRemove
     */
    remove(features: Feature | Feature[]): void {
        const toRemove = Array.isArray(features) ? features : [features];
        if (toRemove.length === 0) return;
        toRemove.forEach(f => {
            let index = this._features.indexOf(f);
            if (index === -1) error(new Error(`Feature ${f} is not in the layer`));
            this._features.splice(index, 1);
        });
        this.fire(new FeaturesRemoveEvent(toRemove));
        this.redraw();
    }

    /**
     * Returns true if the given feature is in the layer
     * @param feature
     */
    has(feature: Feature): boolean {
        return this._features.indexOf(feature) !== -1;
    }

    /**
     * Moves the given feature to the top of the layer (end of the list). If the feature is not in the layer, the command is ignored.
     * @param feature
     */
    moveToTop(feature: Feature): void {
        let index = this._features.indexOf(feature);
        if (index !== -1) {
            this._features.splice(index, 1);
            this._features.push(feature);
            this.redraw();
        }
    }

    /**
     * List of features in the layer. If assigned, it removes all features and add new ones, firing all the respective events.
     * @default []
     * @fires FeaturesAddEvent
     * @fires FeaturesRemoveEvent
     */
    get features(): Feature[] {
        return this._features;
    }
    set features(features: Feature[]) {
        const currFeatures = this._features;
        this._features = [];
        this.fire(new FeaturesRemoveEvent(currFeatures));
        this.add(features);

        this.redraw();
    }
}
