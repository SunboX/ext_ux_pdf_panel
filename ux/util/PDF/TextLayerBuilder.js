/**
 * Copyright (c) 2012 André Fiedler, <https://twitter.com/sonnenkiste>
 *
 * license: MIT-style license
 */
 
 Ext.define('Ext.ux.util.PDF.TextLayerBuilder', {

    textLayerDiv: null,

    constructor: function (config) {
        this.textLayerDiv = config.textLayerDiv;
    },

    beginLayout: function () {
        this.textDivs = [];
        this.textLayerQueue = [];
    },

    endLayout: function () {
        var me = this,
            textDivs = me.textDivs,
            textLayerDiv = me.textLayerDiv,
            renderTimer = null,
            renderingDone = false,
            renderInterval = 0,
            resumeInterval = 500, // in ms
            canvas = document.createElement('canvas'),
            ctx = canvas.getContext('2d');

        // Render the text layer, one div at a time
        function renderTextLayer() {
            if(textDivs.length === 0) {
                clearInterval(renderTimer);
                renderingDone = true;
                me.textLayerDiv = textLayerDiv = canvas = ctx = null;
                return;
            }
            var textDiv = textDivs.shift();
            if(textDiv.dataset.textLength > 0) {
                textLayerDiv.appendChild(textDiv);

                if(textDiv.dataset.textLength > 1) { // avoid div by zero
                    // Adjust div width to match canvas text

                    ctx.font = textDiv.style.fontSize + ' sans-serif';
                    var width = ctx.measureText(textDiv.textContent).width;

                    var textScale = textDiv.dataset.canvasWidth / width;

                    var vendorPrefix = (function () {
                        if('result' in arguments.callee) return arguments.callee.result;

                        var regex = /^(Moz|Webkit|Khtml|O|ms|Icab)(?=[A-Z])/;

                        var someScript = document.getElementsByTagName('script')[0];

                        for(var prop in someScript.style) {
                            if(regex.test(prop)) {
                                return arguments.callee.result = prop.match(regex)[0];
                            }
                        }
                        if('WebkitOpacity' in someScript.style) return arguments.callee.result = 'Webkit';
                        if('KhtmlOpacity' in someScript.style) return arguments.callee.result = 'Khtml';

                        return arguments.callee.result = '';
                    })();

                    var textDivEl = Ext.get(textDiv);

                    // TODO: Check if these styles get set correctly!
                    textDivEl.setStyle(vendorPrefix + '-transform', 'scale(' + textScale + ', 1)');
                    textDivEl.setStyle(vendorPrefix + '-transformOrigin', '0% 0%');
                }
            } // textLength > 0
        }
        renderTimer = setInterval(renderTextLayer, renderInterval);

        // Stop rendering when user scrolls. Resume after XXX milliseconds
        // of no scroll events
        var scrollTimer = null;

        function textLayerOnScroll() {
            if(renderingDone) {
                window.removeEventListener('scroll', textLayerOnScroll, false);
                return;
            }

            // Immediately pause rendering
            clearInterval(renderTimer);

            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(function textLayerScrollTimer() {
                // Resume rendering
                renderTimer = setInterval(renderTextLayer, renderInterval);
            }, resumeInterval);
        } // textLayerOnScroll

        window.addEventListener('scroll', textLayerOnScroll, false);
    }, // endLayout

    appendText: function (text, fontName, fontSize) {
        var textDiv = document.createElement('div');

        // vScale and hScale already contain the scaling to pixel units
        var fontHeight = fontSize * text.geom.vScale;
        textDiv.dataset.canvasWidth = text.canvasWidth * text.geom.hScale;
        textDiv.dataset.fontName = fontName;

        textDiv.style.fontSize = fontHeight + 'px';
        textDiv.style.left = text.geom.x + 'px';
        textDiv.style.top = (text.geom.y - fontHeight) + 'px';
        textDiv.textContent = PDFJS.bidi(text, - 1);
        textDiv.dir = text.direction;
        textDiv.dataset.textLength = text.length;
        this.textDivs.push(textDiv);
    }
});