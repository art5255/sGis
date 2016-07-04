sGis.module('symbol.polyline.Simple', [
    'utils',
    'Symbol',
    'render.Polyline',
    'serializer.symbolSerializer'
], function(utils, Symbol, Polyline, symbolSerializer) {
    
    'use strict';

    /**
     * @namespace sGis.symbol.polyline
     */

    /**
     * Symbol of polyline drawn as simple line
     * @alias sGis.symbol.polyline.Simple
     * @extends sGis.Symbol
     */
    class PolylineSymbol extends Symbol {
        /**
         * @constructor
         * @param {Object} properties - key-value list of the properties to be assigned to the instance.
         */
        constructor(properties) {
            super(properties);
        }

        renderFunction(/** sGis.feature.Polyline */ feature, resolution, crs) {
            var coordinates = PolylineSymbol._getRenderedCoordinates(feature, resolution, crs);
            if (!coordinates) return [];
            return [new Polyline(coordinates, {strokeColor: this.strokeColor, strokeWidth: this.strokeWidth})];
        }

        static _getRenderedCoordinates(feature, resolution, crs) {
            if (!feature.coordinates || !utils.isArray(feature.coordinates) || !utils.isArray(feature.coordinates[0])) return null;
            var projected = feature.projectTo(crs).coordinates;
            
            return projected.map(ring => {
                return ring.map(point => {
                    return [point[0] / resolution, point[1] / -resolution];
                });
            });
        }
    }

    /**
     * Stroke color of the line. Can be any valid css color string.
     * @member {String} strokeColor
     * @memberof sGis.symbol.polyline.Simple
     * @instance
     * @default "black"
     */
    PolylineSymbol.prototype.strokeColor = 'black';

    /**
     * Stroke width of the line.
     * @member {Number} strokeWidth
     * @memberof sGis.symbol.polyline.Simple
     * @default 1
     */
    PolylineSymbol.prototype.strokeWidth = 1;

    symbolSerializer.registerSymbol(PolylineSymbol, 'polyline.Simple', ['strokeColor', 'strokeWidth']);

    return PolylineSymbol;
    
});
