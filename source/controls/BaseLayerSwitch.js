﻿sGis.module('controls.BaseLayerSwitch', [
    'utils',
    'Control',
    'Map',
    'Layer',
    'event',
    'proto'
], function(utils, Control, Map, Layer, ev, proto) {
    'use strict';

    var BaseLayerSwitch = function(painter, options) {
        var map = painter.map;

        if (!(map instanceof sGis.Map)) sGis.utils.error('sGis.Map instance is expected but got ' + map + ' instead');
        this._map = map;
        this._painter = painter;

        sGis.utils.init(this, options);
        this._container = this._getNewControlContainer();

        this._layerDescriptions = [];
        if (options && options.layerDescriptions) this.layerDescriptions = options.layerDescriptions;
    };


    BaseLayerSwitch.prototype = {
        _xAlign: 'right',
        _yAlign: 'bottom',
        _xOffset: 32,
        _yOffset: 32,
        _width: 64,
        _height: 64,
        _inactiveWidth: 56,
        _inactiveHeight: 56,
        _margin: 8,
        _imageWidth: 75,

        activate: function() {
            this.isActive = true;
        },

        deactivate: function() {
            this.isActive = false;
        },

        addLayer: function(layer, imageSrc) {
            if (!(layer instanceof sGis.Layer)) sGis.utils.error('sGis.Layer instance is expected but got ' + layer + ' instead');
            if (!layer.tileScheme) sGis.utils.error('A layer without tile scheme cannot be interpreted as base layer');
            if (this.getLayerIndex(layer) !== -1) sGis.utils.error('The layer is already in the list');

            this._layerDescriptions.push({ layer: layer, imageSrc: imageSrc });
            this._addLayerToImageBox(layer);

            if (this._map.indexOf(layer) !== -1) {
                this.activeLayer = layer;
            }

            this.isActive = this._isActive;

            this.fire('layerAdd', {layer: layer});
        },

        removeLayer: function(layer) {
            if (this._activeLayer === layer) {
                if (this._layerDescriptions.length === 1) {
                    this.deactivate();
                } else {
                    var layerIndex = this.getLayerIndex(layer);
                    this.activeLayer = this._layerDescriptions[layerIndex === 0 ? 1 : layerIndex - 1];
                }
            }

            this._removeLayerFromImageBox(layer);
            this._layerDescriptions.splice(this.getLayerIndex(layer), 1);
        },

        _addLayerToImageBox: function(layer) {
            if (!this._inactiveLayerBox) {
                this._inactiveLayerBox = this._getNewInactiveLayerBox();
                this._scrollContainer = document.createElement("div");
                this._scrollContainer.className = this.pickerContainerCss+"-scroll";
                this._scrollContainer.appendChild(this._inactiveLayerBox);
                this._container.appendChild(this._scrollContainer);
                this._createScroll();
            }

            var index = this.getLayerIndex(layer);
            if (!this._layerDescriptions[index].image) {
                this._layerDescriptions[index].image = this._getLayerImageObject(layer);
            }

            if (index < this._inactiveLayerBox.children.length) {
                this._inactiveLayerBox.insertBefore(this._layerDescriptions[index].image, this._inactiveLayerBox.children[index]);
            } else {
                this._inactiveLayerBox.appendChild(this._layerDescriptions[index].image);
            }

            //this._updateImagePositions();
        },

        _createScroll: function () {
            this._next = document.createElement("div");
            this._prev = document.createElement("div");

            this._next.className = "button everGis-navigation-button everGis-navigation-forward scrollButton";
            this._prev.className = "button everGis-navigation-button everGis-navigation-back scrollButton";
            this._next.onclick = this._scrollNext.bind(this);
            this._prev.onclick = this._scrollPrev.bind(this);
            this._scrollContainer.onwheel = this._scrollWheel.bind(this);
            this._container.appendChild(this._next);
            this._container.appendChild(this._prev);
        },

        _updateScroll: function () {
            if (!this._scrollContainer) return;
            var maxSize = +getComputedStyle(this._scrollContainer).width.replace("px",""),
                listSize = this._layerDescriptions.length * 75;
            if(maxSize < listSize){
                this._showScroll();
            } else {
                this._hideScroll();
            }

            this._scrollNextLimit = Math.round(maxSize / this._imageWidth);
        },

        _showScroll: function () {
            this._next.style.display = "block";
            this._prev.style.display = "block";
        },

        _hideScroll: function () {
            this._next.style.display = "none";
            this._prev.style.display = "none";
        },

        _scrollWheel: function (e) {
            var delta = e.deltaY || e.detail || e.wheelDelta;
            if(delta>0) {
                this._scrollNext();
            } else if (delta<0){
                this._scrollPrev();
            }
            e.stopPropagation();
        },

        _scrollNext: function (e) {
            var count = this._layerDescriptions.length,
                width = this._imageWidth,
                scrollLimit = this._scrollNextLimit,
                currentPosition = this._currentPosition | 0,
                position = Math.max(currentPosition - width, -width *(count - scrollLimit));
            this._inactiveLayerBox.style.marginLeft = position + 'px';
            this._currentPosition = position;
            e&&e.stopPropagation();
        },
        _scrollPrev: function (e) {
            var width = this._imageWidth,
                currentPosition = this._currentPosition | 0,
                position = Math.min(currentPosition + width, 0);
            this._inactiveLayerBox.style.marginLeft = position + 'px';
            this._currentPosition = position;
            e&&e.stopPropagation();
        },

        _updateImagePositions: function() {
            var top = this._height - this._inactiveHeight;
            for (var i = 0, len = this._layerDescriptions.length; i < len; i++) {
                this._layerDescriptions[i].image.style.top = top + 'px';
                this._layerDescriptions[i].image.style.left = i * (this._inactiveWidth + this._margin) + 'px';
            }
        },

        _getLayerImageObject: function(layer) {
            var image = new Image();
            image.src = this._layerDescriptions[this.getLayerIndex(layer)].imageSrc;
            image.className = this.pickerCss;

            var self = this;
            image.onclick = function(event) {
                if (self.activeLayer !== layer) {
                    self.activeLayer = layer;
                    event.stopPropagation();
                }
            };

            var label = document.createElement('span');
            label.innerHTML = layer.name;

            var container = document.createElement('div');
            container.className = 'sGis-control-baseLayerSwitch-imageContainer';
            container.appendChild(image);
            container.appendChild(label);

            return container;
        },

        _getNewInactiveLayerBox: function() {
            var box = document.createElement('div');
            box.className = this.pickerContainerCss;

            if (this.useToggle) box.style.maxWidth = '0px';

            return box;
        },

        _removeLayerFromImageBox: function(layer) {
            this._inactiveLayerBox.removeChild(this._layerDescriptions[this.getLayerIndex(layer)].image);
        },

        getLayerIndex: function(layer) {
            for (var i = 0, len = this._layerDescriptions.length; i < len; i++) {
                if (this._layerDescriptions[i].layer === layer) return i;
            }
            return -1;
        },

        _setActiveLayerImage: function() {
            if (!this._activeLayerImageContainer) {
                this._activeLayerImageContainer = this._getNewActiveLayerImageContainer();
                this._container.appendChild(this._activeLayerImageContainer);
            }

            if (this._activeLayerImageContainer.children.length > 0) {
                this._activeLayerImageContainer.removeChild(this._activeLayerImageContainer.children[0]);
            }

            var index = this.getLayerIndex(this._activeLayer);
            if (!this._layerDescriptions[index].image) {
                this._layerDescriptions[index].image = this._getLayerImageObject(this._activeLayer);
            }

            var images = this._layerDescriptions[index].image.getElementsByTagName('img');

            if (images && images[0]) {
                this._activeLayerImageContainer.style.backgroundImage = 'url(' + images[0].src + ')';
            }
        },

        _getNewActiveLayerImageContainer: function() {
            var container = document.createElement('div');
            container.className = this.activeCss;

            var self = this;
            ev.add(container, 'click', function(event) {
                if (self.useToggle) {
                    if (self._inactiveLayerBox.style.maxWidth === '0px') {
                        self._showInactiveLayerBox();
                    } else {
                        self._hideInactiveLayerBox();
                    }
                    event.stopPropagation();
                }
            });

            return container;
        },

        _getNewControlContainer: function() {
            var container = document.createElement('div');
            container.className = this.containerCss;

            ev.add(container, 'dblclick', function(event) {
                event.stopPropagation();
            });

            return container;
        },

        _showInactiveLayerBox: function() {
            var layerCount = this._layerDescriptions.length;
            this._inactiveLayerBox.style.maxWidth = '1024px';
        },

        _hideInactiveLayerBox: function() {
            this._inactiveLayerBox.style.maxWidth = '0px';
        },

        _updateInactiveLayersDecoration: function() {
            var activeLayer = this.activeLayer;
            for (var i = 0, len = this._layerDescriptions.length; i < len; i++) {
                var image = this._layerDescriptions[i].image;
                var index = image.className.indexOf(this.pickerActiveCss);
                var isActive = this.activeLayer === this._layerDescriptions[i].layer;

                if (index === -1 && isActive) {
                    image.className += ' ' + this.pickerActiveCss;
                } else if (index !== -1 && !isActive) {
                    image.className = image.className.substr(0, index - 1) + image.className.substr(index + this.pickerActiveCss.length);
                }
            }
        }
    };

    Object.defineProperties(BaseLayerSwitch.prototype, {
        xAlign: {
            get: function() {
                return this._xAlign;
            },
            set: function(align) {
                sGis.utils.validateValue(align, ['left', 'right']);
                this._xAlign = align;
            }
        },

        yAlign: {
            get: function() {
                return this._yAlign;
            },
            set: function(align) {
                sGis.utils.validateValue(align, ['top', 'bottom']);
                this._yAlign = align;
            }
        },

        xOffset: {
            get: function() {
                return this._xOffset;
            },
            set: function(offset) {
                sGis.utils.validateNumber(offset);
                this._xOffset = offset;
            }
        },

        yOffset: {
            get: function() {
                return this._yOffset;
            },
            set: function(offset) {
                sGis.utils.validateNumber(offset);
                this._yOffset = offset;
            }
        },

        width: {
            get: function() {
                return this._width;
            },
            set: function(width) {
                sGis.utils.validatePositiveNumber(width);
                this._width = width;
            }
        },

        height: {
            get: function() {
                return this._height;
            },
            set: function(height) {
                sGis.utils.validatePositiveNumber(height);
                this._height = height;
            }
        },

        inactiveWidth: {
            get: function() {
                return this._inactiveWidth;
            },
            set: function(width) {
                sGis.utils.validatePositiveNumber(width);
                this._inactiveWidth = width;
            }
        },

        inactiveHeight: {
            get: function() {
                return this._inactiveHeight;
            },
            set: function(height) {
                sGis.utils.validatePositiveNumber(height);
                this._inactiveHeight = height;
            }
        }
    });

    sGis.utils.proto.setProperties(BaseLayerSwitch.prototype, {
        layerDescriptions: {
            get: function() {
                return this._layerDescriptions;
            },
            set: function(descriptions) {
                if (this._layerDescriptions.length > 0) {
                    for (var i = 0, len = this._layerDescriptions; i < len; i++) {
                        this.removeLayer(this._layerDescriptions[i]);
                    }
                }
                for (var i = 0, len = descriptions.length; i < len; i++) {
                    this.addLayer(descriptions[i].layer, descriptions[i].imageSrc);
                }
            }
        },

        activeLayer: {
            get: function() {
                return this._activeLayer;
            },
            set: function(layer) {
                if (layer !== this._activeLayer) {
                    var indexInList = this.getLayerIndex(layer),
                        indexOnMap = 0;
                    if (indexInList === -1) sGis.utils.error('The layer is not in the list');

                    if (this._activeLayer) {
                        indexOnMap = this._map.indexOf(this._activeLayer);
                        this._map.removeLayer(this._activeLayer);
                    }

                    this._map.insertLayer(layer, indexOnMap);
                    this._activeLayer = layer;

                    this._setActiveLayerImage();
                    this._updateInactiveLayersDecoration();

                    this.fire('activeLayerChange');
                }
            }
        },

        useToggle: {
            default: true,
            set: function(bool) {
                if (this._inactiveLayerBox) {
                    if (bool) {
                        this._inactiveLayerBox.style.maxWidth = '0px';
                    } else {
                        this._inactiveLayerBox.style.maxWidth = '';
                    }
                }
                this._useToggle = bool;
            }
        },

        isActive: {
            default: true,
            set: function(bool) {
                if (bool) {
                    if (this._painter.innerWrapper) this._painter.innerWrapper.appendChild(this._container);
                    this._isActive = true;
                    this.fire('activate');
                } else {
                    if (this._painter.innerWrapper && this._container.parentNode) this._painter.innerWrapper.removeChild(this._container);
                    this._isActive = false;
                    this.fire('deactivate');
                }
            }
        },

        containerCss: {
            default: 'sGis-control-baseLayerSwitch-container',
            set: function(css) {
                if (this._container) this._container.className = css;
                this._containerCss = css;
            }
        },
        activeCss: {
            default: 'sGis-control-baseLayerSwitch-active',
            set: function(css) {
                if (this._activeLayerImageContainer) this._activeLayerImageContainer.className = css;
                this._activeCss = css;
            }
        },
        pickerCss: {
            default: 'sGis-control-baseLayerSwitch-picker',
            set: function(css) {
                if (this._inactiveLayerBox) {
                    var images = this._inactiveLayerBox.childNodes;
                    for (var i = 0; i < images.length; i++) {
                        images.className = css;
                    }
                }

                this._pickerCss = css;

                this._updateInactiveLayersDecoration();
            }
        },
        pickerActiveCss: {
            default: 'sGis-control-baseLayerSwitch-pickerActive',
            set: function(css) {
                this._pickerActiveCss = css;
                this.pickerCss = this._pickerCss;
            }
        },
        pickerContainerCss: {
            default: 'sGis-control-baseLayerSwitch-pickerContainer',
            set: function(css) {
                if (this._inactiveLayerBox) this._inactiveLayerBox.className = css;
                this._pickerContainerCss = css;
            }
        },
        container: {
            default: null,
            get: function() {
                return this._container;
            },
            set: null
        }
    });


    var defaultCss = '.sGis-control-baseLayerSwitch-container {position: absolute; right: 32px; bottom: 32px; width: 64px; height: 64px;} ' +
            '.sGis-control-baseLayerSwitch-active {position: absolute; right: 0px; top: 0px; width: 64px; height: 64px; border: 1px solid black; background-size: 100%; cursor: pointer;}' +
            '.sGis-control-baseLayerSwitch-picker {cursor: pointer; border: 1px solid gray;} ' +
            '.sGis-control-baseLayerSwitch-pickerActive {border: 2px solid DarkViolet;} ' +
            '.sGis-control-baseLayerSwitch-pickerContainer {transition: max-width 0.5s, max-height 0.5s; -webkit-transition: max-width 0.5s, max-height 0.5s; overflow: hidden; position: absolute; right: 70px; white-space: nowrap;} ' +
            '.sGis-control-baseLayerSwitch-pickerContainer img {width: 56px; height: 56px; margin: 5px;}' +
            '.sGis-control-baseLayerSwitch-imageContainer { display: inline-block; }' +
            '.sGis-control-baseLayerSwitch-imageContainer span { display: none; }',
        buttonStyle = document.createElement('style');
    buttonStyle.type = 'text/css';
    if (buttonStyle.styleSheet) {
        buttonStyle.styleSheet.cssText = defaultCss;
    } else {
        buttonStyle.appendChild(document.createTextNode(defaultCss));
    }

    document.head.appendChild(buttonStyle);

    return BaseLayerSwitch;

});
