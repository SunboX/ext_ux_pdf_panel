/**
 * Copyright(c) 2012 André Fiedler, <https://twitter.com/sonnenkiste>
 *
 * license: MIT-style license
 */

Ext.define('Ext.ux.panel.PDF',{
    extend: 'Ext.panel.Panel',

    alias: 'widget.pdfpanel',

    extraBaseCls: Ext.baseCSSPrefix + 'pdf',
    extraBodyCls: Ext.baseCSSPrefix + 'pdf-body',

    autoScroll: true,

    /**
     * @cfg{String} src
     * URL to the PDF - Same Domain or Server with CORS Support
     */
    src: '',

    /**
     * @cfg{Double} pageScale
     * Initial scaling of the PDF. 1 = 100%
     */
    pageScale: 1,

    /**
     * @cfg{Boolean} disableWorker
     * Disable workers to avoid yet another cross-origin issue(workers need the URL of
     * the script to be loaded, and currently do not allow cross-origin scripts)
     */
    disableWorker: true,

    /**
     * @cfg{Boolean} disableTextLayer
     * Enable to render selectable but hidden text layer on top of an PDF-Page.
     * This feature is buggy by now and needs more investigation!
     */
    disableTextLayer: true, // true by now, cause it´s buggy
    
    /**
     * @cfg{String} loadingMessage
     * The text displayed when loading the PDF.
     */
    loadingMessage: 'Loading PDF, please wait...',
    
    /**
     * @cfg{String} beforePageText
     * The text displayed before the input item.
     */
    beforePageText: 'Page',
    
    /**
     * @cfg{String} afterPageText
     * Customizable piece of the default paging text. Note that this string is formatted using
     *{0} as a token that is replaced by the number of total pages. This token should be preserved when overriding this
     * string if showing the total page count is desired.
     */
    afterPageText: 'of {0}',
    
    /**
     * @cfg{String} firstText
     * The quicktip text displayed for the first page button.
     * **Note**: quick tips must be initialized for the quicktip to show.
     */
    firstText: 'First Page',
    
    /**
     * @cfg{String} prevText
     * The quicktip text displayed for the previous page button.
     * **Note**: quick tips must be initialized for the quicktip to show.
     */
    prevText: 'Previous Page',
    
    /**
     * @cfg{String} nextText
     * The quicktip text displayed for the next page button.
     * **Note**: quick tips must be initialized for the quicktip to show.
     */
    nextText: 'Next Page',
    
    /**
     * @cfg{String} lastText
     * The quicktip text displayed for the last page button.
     * **Note**: quick tips must be initialized for the quicktip to show.
     */
    lastText: 'Last Page',
    
    /**
     * @cfg{Number} inputItemWidth
     * The width in pixels of the input field used to display and change the current page number.
     */
    inputItemWidth: 30,
    
    /**
     * @cfg{Number} inputItemWidth
     * The width in pixels of the combobox used to change display scale of the PDF.
     */
    scaleWidth: 60,

    getPagingItems: function(){
        var me = this;

        return [{
            itemId: 'first',
            tooltip: me.firstText,
            overflowText: me.firstText,
            iconCls: Ext.baseCSSPrefix + 'tbar-page-first',
            disabled: true,
            handler: me.moveFirst,
            scope: me
        },
        {
            itemId: 'prev',
            tooltip: me.prevText,
            overflowText: me.prevText,
            iconCls: Ext.baseCSSPrefix + 'tbar-page-prev',
            disabled: true,
            handler: me.movePrevious,
            scope: me
        },
        '-',
        me.beforePageText,
        {
            xtype: 'numberfield',
            itemId: 'inputItem',
            name: 'inputItem',
            cls: Ext.baseCSSPrefix + 'tbar-page-number',
            allowDecimals: false,
            minValue: 1,
            hideTrigger: true,
            enableKeyEvents: true,
            keyNavEnabled: false,
            selectOnFocus: true,
            submitValue: false,
            // mark it as not a field so the form will not catch it when getting fields
            isFormField: false,
            width: me.inputItemWidth,
            margins: '-1 2 3 2',
            disabled: true,
            listeners: {
                scope: me,
                keydown: me.onPagingKeyDown,
                blur: me.onPagingBlur
            }
        },
        {
            xtype: 'tbtext',
            itemId: 'afterTextItem',
            text: Ext.String.format(me.afterPageText, 1),
            margins: '0 5 0 0'
        },
        '-',
        {
            itemId: 'next',
            tooltip: me.nextText,
            overflowText: me.nextText,
            iconCls: Ext.baseCSSPrefix + 'tbar-page-next',
            disabled: true,
            handler: me.moveNext,
            scope: me
        },
        {
            itemId: 'last',
            tooltip: me.lastText,
            overflowText: me.lastText,
            iconCls: Ext.baseCSSPrefix + 'tbar-page-last',
            disabled: true,
            handler: me.moveLast,
            scope: me
        },
        '->',
        {
            itemId: 'scaleCombo',
            xtype: 'combobox',
            editable: false,
            keyNavEnabled: true,
            selectOnFocus: false,
            submitValue: false,
            // mark it as not a field so the form will not catch it when getting fields
            isFormField: false,
            autoSelect: true,
            disabled: true,
            width: me.scaleWidth,
            store: new Ext.data.SimpleStore({
                id: 0,
                fields: ['scale', 'text'],
                data: [
                    [0.5, '50%'],
                    [0.75, '75%'],
                    [1, '100%'],
                    [1.25, '125%'],
                    [1.5, '150%'],
                    [2, '200%']
                ]
            }),
            valueField: 'scale',
            displayField: 'text',
            mode: 'local',
            listeners: {
                scope: me,
                change: me.onScaleChange,
                blur: me.onScaleBlur
            }
        }];
    },

    initComponent: function(){
        var me = this,
            pagingItems = me.getPagingItems(),
            userItems = me.items || [],
            userDockedItems = me.dockedItems || [];

        me.bodyCls = me.bodyCls || '';
        me.bodyCls += (' ' + me.extraBodyCls);

        me.cls = me.cls || '';
        me.cls += (' ' + me.extraBaseCls);

        PDFJS.disableTextLayer = me.disableTextLayer;

        userDockedItems.push({
            itemId: 'pagingToolbar',
            xtype: 'toolbar',
            dock: 'bottom',
            items: pagingItems
        });
        me.dockedItems = userDockedItems;

        var textLayerDiv = '';
        if(!PDFJS.disableTextLayer){
            textLayerDiv = '<div class="pdf-text-layer"></div>';
        }

        userItems.push({
            itemId: 'pdfPageContainer',
            xtype: 'container',
            width: '100%',
            height: '100%',
            html: '<canvas class="pdf-page-container"></canvas>' + textLayerDiv,
            listeners:{
                afterrender: function(){
                    me.pageContainer = this.el.query('.pdf-page-container')[0];
                    me.pageContainer.mozOpaque = true;
                    
                    var ctx = me.pageContainer.getContext('2d');
                    ctx.save();
                    ctx.fillStyle = 'rgb(255, 255, 255)';
                    ctx.fillRect(0, 0, me.pageContainer.width, me.pageContainer.height);
                    ctx.restore();
                    
                    if(!PDFJS.disableTextLayer){
                        me.textLayerDiv = this.el.query('.pdf-text-layer')[0];
                    }
                }
            }
        });
        me.items = userItems;

        me.callParent(arguments);

        me.on('afterrender', function(){
            me.loader = new Ext.LoadMask(me.child('#pdfPageContainer'),{
                msg: me.loadingMessage
            });
            me.loader.show();
        }, me,{
            single: true
        });

        if(me.disableWorker){
            PDFJS.disableWorker = true;
        }

        // Asynchronously download PDF as an ArrayBuffer
        me.getDocument();
    },

    onLoad: function(){
        var me = this, isEmpty;

        isEmpty = me.pdfDoc.numPages === 0;
        me.currentPage = me.currentPage || (isEmpty ? 0 : 1);

        me.renderPage(me.currentPage);
    },

    renderPage: function(num){
        var me = this,
            toolbar = me.child('#pagingToolbar'),
            isEmpty, pageCount,
            currPage, afterText;

        if(me.isRendering) return;

        me.isRendering = true;
        me.currentPage = num;

        currPage = me.currentPage;
        pageCount = me.pdfDoc.numPages;
        afterText = Ext.String.format(me.afterPageText, isNaN(pageCount) ? 1 : pageCount);
        isEmpty = pageCount === 0;
        Ext.suspendLayouts();
        toolbar.child('#afterTextItem').setText(afterText);
        toolbar.child('#inputItem').setDisabled(isEmpty).setValue(currPage);
        toolbar.child('#first').setDisabled(currPage === 1 || isEmpty);
        toolbar.child('#prev').setDisabled(currPage === 1 || isEmpty);
        toolbar.child('#next').setDisabled(currPage === pageCount || isEmpty);
        toolbar.child('#last').setDisabled(currPage === pageCount || isEmpty);
        toolbar.child('#scaleCombo').setDisabled(isEmpty).setValue(me.pageScale);

        // Using promise to fetch the page
        me.pdfDoc.getPage(num).then(function(page){
            var viewport = page.getViewport(me.pageScale);
            me.pageContainer.height = viewport.height;
            me.pageContainer.width = viewport.width;

            var ctx = me.pageContainer.getContext('2d');
            ctx.save();
            ctx.fillStyle = 'rgb(255, 255, 255)';
            ctx.fillRect(0, 0, me.pageContainer.width, me.pageContainer.height);
            ctx.restore();

            var textLayer = me.textLayerDiv ? Ext.create('Ext.ux.util.PDF.TextLayerBuilder',{
                textLayerDiv: me.textLayerDiv
            }) : null;

            // Render PDF page into canvas context
            var renderContext ={
                canvasContext: ctx,
                viewport: viewport,
                textLayer: textLayer
            };
            page.render(renderContext);

            Ext.resumeLayouts(true);

            me.isRendering = false;

            if(me.loader){
                me.loader.destroy();
            }

            if(me.rendered){
                me.fireEvent('change', me, {
                    current: me.currentPage,
                    total: me.pdfDoc.numPages
                });
            }
        });
    },

    moveFirst: function(){
        var me = this;
        if(me.fireEvent('beforechange', me, 1) !== false){
            me.renderPage(1);
        }
    },

    movePrevious: function(){
        var me = this,
            prev = me.currentPage - 1;

        if(prev > 0){
            if(me.fireEvent('beforechange', me, prev) !== false){
                me.renderPage(prev);
            }
        }
    },

    moveNext: function(){
        var me = this,
            total = me.pdfDoc.numPages,
            next = me.currentPage + 1;

        if(next <= total){
            if(me.fireEvent('beforechange', me, next) !== false){
                me.renderPage(next);
            }
        }
    },

    moveLast: function(){
        var me = this,
            last = me.pdfDoc.numPages;

        if(me.fireEvent('beforechange', me, last) !== false){
            me.renderPage(last);
        }
    },

    readPageFromInput: function(){
        var me = this, v = me.child('#pagingToolbar').child('#inputItem').getValue(),
            pageNum = parseInt(v, 10);

        if(!v || isNaN(pageNum)){
            me.child('#pagingToolbar').child('#inputItem').setValue(me.currentPage);
            return false;
        }
        return pageNum;
    },

    onPagingFocus: function(){
        this.child('#pagingToolbar').child('#inputItem').select();
    },

    onPagingBlur: function(e){
        var curPage = this.getPageData().currentPage;
        this.child('#pagingToolbar').child('#inputItem').setValue(curPage);
    },

    onPagingKeyDown: function(field, e){
        var me = this,
            k = e.getKey(),
            increment = e.shiftKey ? 10 : 1,
            pageNum, total = me.pdfDoc.numPages;

        if(k == e.RETURN){
            e.stopEvent();
            pageNum = me.readPageFromInput();
            if(pageNum !== false){
                pageNum = Math.min(Math.max(1, pageNum), total);
                if(me.fireEvent('beforechange', me, pageNum) !== false){
                    me.renderPage(pageNum);
                }
            }
        } else if(k == e.HOME || k == e.END){
            e.stopEvent();
            pageNum = k == e.HOME ? 1 : total;
            field.setValue(pageNum);
        } else if(k == e.UP || k == e.PAGE_UP || k == e.DOWN || k == e.PAGE_DOWN){
            e.stopEvent();
            pageNum = me.readPageFromInput();
            if(pageNum){
                if(k == e.DOWN || k == e.PAGE_DOWN){
                    increment *= -1;
                }
                pageNum += increment;
                if(pageNum >= 1 && pageNum <= total){
                    field.setValue(pageNum);
                }
            }
        }
    },

    onScaleBlur: function(e){
        this.child('#pagingToolbar').child('#scaleCombo').setValue(this.pageScale);
    },

    onScaleChange: function(combo, newValue){
        var me = this;
        me.pageScale = newValue;
        me.renderPage(me.currentPage);
    },
    
    setSrc: function(src){
        this.src = src;
        return this.getDocument();
    },
    
    getDocument: function(){
        var me = this;
        if(!!me.src){
            PDFJS.getDocument(me.src).then(function(pdfDoc){
                me.pdfDoc = pdfDoc;
                me.onLoad();
            });
        }
        return me;
    }
});