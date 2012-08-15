Ext.ux.panel.PDF
===============

A PDF Viewer Panel for the ExtJS 4.1 Framework - No Browser Plugin required, pure JavaScript.
PDF Rendering is done using the great Mozilla PDF.js Library (<a href="https://github.com/mozilla/pdf.js">https://github.com/mozilla/pdf.js</a>).

### Usage ###

    Ext.create('Ext.ux.panel.PDF', {
        title    : 'PDF Panel',
        width    : 489,
        height   : 633,
        pageScale: 0.75,                                           // Initial scaling of the PDF. 1 = 100%
        src      : 'http://cdn.mozilla.net/pdfjs/tracemonkey.pdf', // URL to the PDF - Same Domain or Server with CORS Support
        renderTo : Ext.getBody()
    });
    
### Demo ###

For an demo, please visit <a href="http://SunboX.github.com/ext_ux_pdf_panel/demo/">http://SunboX.github.com/ext_ux_pdf_panel/demo/</a>