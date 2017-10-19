import {Canvas} from "./Canvas";
import {Bbox} from "../../Bbox";
import {SvgRender} from "./SvgRender";
import {Container} from "./Container";

/**
 * @alias sGis.painter.domPainter.LayerRenderer
 * @ignore
 */
export class LayerRenderer {
    delayedUpdateTime = 500;
    listensFor = ['click', 'dblclick', 'dragStart', 'mousemove', 'mouseover'];

    private _currentResolution: number;
    private _bbox: Bbox;
    private _canvas: Canvas;
    private _useCanvas: boolean;
    private _layer: any;
    private _master: any;
    private _featureRenders: Map<any, any>;
    private _loadingRenders: Map<any, any>;
    private _renderNodeMap: Map<any, any>;
    private _renderContainerMap: Map<any, any>;
    private _outdatedFeatureRenders: Map<any, any>;
    private _rendersForRemoval: Map<any, any>;
    private _eventCatchers: any;
    private _index: number;
    private _zIndex: number;

    updateNeeded: boolean;
    private _canvasContainer: any;
    private _updateTimer: any;
    private _currentContainer: Container;


    /**
     * @constructor
     * @alias sGis.renderers.domRenderer.LayerRenderer.constructor
     * @param master
     * @param layer
     * @param index
     * @param useCanvas
     */
    constructor(master, layer, index, useCanvas = true) {
        this._master = master;
        this._layer = layer;
        this._useCanvas = useCanvas;
        this._canvas = new Canvas();

        this._bbox = new Bbox([Infinity, Infinity], [Infinity, Infinity]);
        this._featureRenders = new Map();
        this._loadingRenders = new Map();
        this._renderNodeMap = new Map();
        this._renderContainerMap = new Map();

        this._outdatedFeatureRenders = new Map();
        this._rendersForRemoval = new Map();

        this._setEventCatcherMaps();

        this._setListeners();
        this.setIndex(index);

        this._forceUpdate();
    }

    get layer() { return this._layer; }

    _setListeners() {
        this._layer.on('propertyChange', () => {
            this._forceUpdate();
        });
    }

    _setEventCatcherMaps() {
        this._eventCatchers = {};
        this.listensFor.forEach(eventName => {
           this._eventCatchers[eventName] = new Map();
        });
    }

    _forceUpdate() {
        this.updateNeeded = true;
    }

    setIndex(index) {
        if (index === this._index) return;

        let zIndex = index*2+1;
        for (let renders of this._featureRenders.values()) {
            renders.forEach(render => {
                let node = this._renderNodeMap.get(render);
                if (node) node.style.zIndex = zIndex;
            });
        }

        for (let renders of this._outdatedFeatureRenders.values()) {
            renders.forEach(render => {
                let node = this._renderNodeMap.get(render);
                if (node) node.style.zIndex = zIndex;
            });
        }

        this._canvas.setIndex(index*2);

        this._index = index;
        this._zIndex = zIndex;
    }

    clear() {
        for (let render of this._loadingRenders.keys()) {
            this._removeRender(render);
        }

        for (let feature of this._outdatedFeatureRenders.keys()) {
            this._clean(feature);
        }

        for (let feature of this._featureRenders.keys()) {
            this._removeRenders(feature);
        }

        for (let render of this._renderNodeMap.keys()) {
            this._removeRender(render);
        }

        if (this._canvasContainer) this._canvasContainer.removeNode(this._canvas.node);
        if (this._updateTimer) clearTimeout(this._updateTimer);
    }

    update() {
        if (this._layer.delayedUpdate) {
            if (this._updateTimer) clearTimeout(this._updateTimer);

            if (this.updateNeeded) {
                this._rerender();
            } else {
                this._updateTimer = setTimeout(() => { this._rerender(); }, this.delayedUpdateTime);
            }
        } else {
            this._rerender();
        }

        this.updateNeeded = false;
    }

    _rerender() {
        let bbox = this._master.bbox;

        let newFeatures = this._layer.getFeatures(bbox, this._master.map.resolution);
        if (this._layer.updateProhibited) return;

        for (let feature of this._featureRenders.keys()) {
            if (newFeatures.indexOf(feature) < 0) this._markForRemoval(feature);
        }

        this._bbox = bbox;
        this._resetCanvas(bbox);

        newFeatures.forEach(feature => {
            this._draw(feature);
        });

        if (this._canvas.isEmpty) {
            if (this._canvasContainer) this._canvasContainer.removeNode(this._canvas.node);
            this._canvasContainer = null;
        } else {
            if (this._canvasContainer) this._canvasContainer.removeNode(this._canvas.node);
            this._master.currContainer.addNode(this._canvas.node, this._master.width, this._master.height, this._bbox);
            this.currentContainer = this._master.currContainer;
            this._canvasContainer = this._master.currContainer;
        }

        // TODO: здесь ошибка, что-то не так...
        this._clean();
    }

    _resetCanvas(bbox) {
        this._canvas.reset(bbox, this._master.map.resolution, this._master.width, this._master.height);
    }

    _featureIsLoading(feature) {
        let renders = this._featureRenders.get(feature);
        if (!renders) return false;

        for (let i = 0; i < renders.length; i++) {
            if (this._loadingRenders.has(renders[i])) return true;
        }

        return false;
    }

    _draw(feature) {
        if (this._featureIsLoading(feature)) return;
        this._removeForRemoval(feature);

        this._currentResolution = this._master.map.resolution;

        let renders = feature.render(this._currentResolution, this._master.map.crs);

        let isMixedRender = false;
        var canvasIsUsed = this._useCanvas && renders[0] && renders[0].isVector;
        for (let i = 1; i < renders.length; i++) {
            if (this._useCanvas && renders[i] && renders[i].isVector) canvasIsUsed = true;
            if (renders[i].isVector !== renders[i-1].isVector) {
                isMixedRender = true;
                break;
            }
        }
        if (isMixedRender) canvasIsUsed = false;

        let prevRenders = this._featureRenders.get(feature);
        if (!canvasIsUsed && prevRenders === renders) return;

        if (prevRenders !== renders) this._markAsOutdated(feature);
        this._featureRenders.set(feature, renders);

        for (let i = 0; i < renders.length; i++) {
            if (renders[i].isVector) {
                if (this._useCanvas && !isMixedRender) {
                    this._canvas.draw(renders[i]);
                } else {
                    this._drawNodeRender(renders[i], feature);
                }
            } else {
                this._drawNodeRender(renders[i], feature);
            }
            this._setFeatureListeners(feature, renders[i]);
        }

        if (canvasIsUsed || renders.length === 0) this._clean(feature);
    }

    _setFeatureListeners(feature, render) {
        this.listensFor.forEach(eventName => {
            if (!feature.hasListeners(eventName) || render.ignoreEvents) return;

            this._eventCatchers[eventName].set(render, feature);
        });
    }

    _drawNodeRender(render, feature) {
        if (this._loadingRenders.has(render)) return;

        this._loadingRenders.set(render, 1);

        var callback = (error, node) => {
            this._loadingRenders.delete(render);

            if (error) {
                return this._clean(feature);
            }

            if (!this._featureRenders.has(feature)
                || !render.baseRender && this._featureRenders.get(feature).indexOf(render) < 0
                || render.baseRender && this._featureRenders.get(feature).indexOf(render.baseRender) < 0
                || this._outdatedFeatureRenders.has(render) || this._rendersForRemoval.has(render)) return;

            node.style.zIndex = this._zIndex;

            let container = this._master.currContainer;
            if (render.bbox) {
                container.addNode(node, render.width || node.width, render.height || node.height, render.bbox);
            } else if (render.position || svgRender.position) {
                let k = this._currentResolution / container.resolution;
                let position = render.position || svgRender.position;
                container.addFixedSizeNode(node, [position[0]*k, position[1]*k], render.offset);
            }

            this._renderNodeMap.set(render, node);

            this._renderContainerMap.set(render, container);
            this.currentContainer = container;

            if (render.onAfterDisplayed) render.onAfterDisplayed(node);

            this._clean(feature);
        };

        if (render.getNode) {
            render.getNode(callback);
        } else {
            var svgRender = new SvgRender(render);
            svgRender.getNode(callback);
        }
    }

    get currentContainer() { return this._currentContainer; }
    set currentContainer(container) {
        if (this._currentContainer !== container) {
            this._currentContainer = container;
            this._master.resolveLayerOverlay();
        }
    }

    _clean(feature = null) {
        var outdated = feature && this._outdatedFeatureRenders.get(feature);
        if (outdated) {
            outdated.forEach(render => {
                this._removeRender(render);
            });

            this._outdatedFeatureRenders.delete(feature);
        }

        if (this._loadingRenders.size > 0) return;

        setTimeout(() => {
            for (var renders of this._rendersForRemoval.values()) {
                renders.forEach(render => {
                    this._removeRender(render);
                });
            }
            this._rendersForRemoval.clear();
        }, this._layer.transitionTime || 0);
    }

    _markForRemoval(feature) {
        var forRemoval = this._rendersForRemoval.get(feature) || [];

        var renders = this._featureRenders.get(feature);
        renders.forEach(render => {
            forRemoval.push(render);
        });

        this._rendersForRemoval.set(feature, forRemoval);
        this._featureRenders.delete(feature);
    }

    _removeForRemoval(feature) {
        let renders = this._rendersForRemoval.get(feature);
        if (renders && !this._featureRenders.has(feature)) {
            renders.forEach(render => { this._removeRender(render); });
            this._rendersForRemoval.delete(feature);
        }
    }

    _markAsOutdated(feature) {
        var renders = this._featureRenders.get(feature);
        if (!renders) return;

        var outdated = this._outdatedFeatureRenders.get(feature) || [];
        renders.forEach(render => {
            outdated.push(render);
        });

        this._outdatedFeatureRenders.set(feature, outdated);
        this._featureRenders.delete(feature);

    }

    _removeRenders(feature) {
        let renders = this._featureRenders.get(feature);

        if (renders) {
            renders.forEach(render => {
                this._removeRender(render);
            });
            this._featureRenders.delete(feature);
        }

        let outdated = this._outdatedFeatureRenders.get(feature);
        if (outdated) {
            outdated.forEach(render => {
                this._removeRender(render);
            });
            this._outdatedFeatureRenders.delete(feature);
        }
    }

    _removeRender(render) {
        this.listensFor.forEach(eventName => {
            this._eventCatchers[eventName].delete(render);
        });

        let node = this._renderNodeMap.get(render);
        if (node === undefined) return;

        let container = this._renderContainerMap.get(render);
        if (container) {
            if (node) container.removeNode(node);
            this._renderContainerMap.delete(render);
        }

        this._renderNodeMap.delete(render);
    }

    moveToLastContainer() {
        for (let renders of this._outdatedFeatureRenders.values()) {
            this._moveRendersToLastContainer(renders);
        }

        for (let renders of this._featureRenders.values()) {
            this._moveRendersToLastContainer(renders);
        }

        if (this._canvas.node.parentNode) {
            this._master.currContainer.addNode(this._canvas.node, this._canvas.width, this._canvas.height, this._bbox);
            this._canvasContainer = this._master.currContainer;
        }
    }

    _moveRendersToLastContainer(renders) {
        var lastContainer = this._master.currContainer;
        renders.forEach(render => {
            let node = this._renderNodeMap.get(render);
            let container = this._renderContainerMap.get(render);
            if (node && container) {
                if (container !== lastContainer) {
                    if (render.bbox) {
                        lastContainer.addNode(node, render.width || node.width, render.height || node.height, render.bbox);
                    } else if (render.position) {
                        let k = this._currentResolution / lastContainer.resolution;
                        lastContainer.addFixedSizeNode(node, [render.position[0] * k, render.position[1] * k], render.offset);
                    } else {
                        let svgRender = new SvgRender(render, container.resolution / lastContainer.resolution);
                        svgRender.getNode((err, newNode) => {
                            if (!svgRender.position || !this._renderNodeMap.has(render)) return;
                            container.removeNode(node);
                            this._renderNodeMap.set(render, newNode);
                            lastContainer.addFixedSizeNode(newNode, svgRender.position);
                        });
                    }
                    this._renderContainerMap.set(render, lastContainer);
                }
            }
        });
    }

    getEventCatcher(eventName, pxPosition, data) {
        if (!this._eventCatchers[eventName]) return;

        for (var render of this._eventCatchers[eventName].keys()) {
            var intersectionType = render.contains && render.contains(pxPosition);
            if (intersectionType) {
                data.intersectionType = intersectionType;
                return this._eventCatchers[eventName].get(render);
            }
        }
    }
}