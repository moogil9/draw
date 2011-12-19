var APP = (typeof APP !== 'undefined') ? APP : {};
APP.util = (typeof APP.util !== 'undefined') ? APP.util : {};
APP.config = (typeof APP.config !== 'undefined') ? APP.config : {};
APP.model = (typeof APP.model !== 'undefined') ? APP.model : {};
APP.view = (typeof APP.view !== 'undefined') ? APP.view : {};
APP.controller = (typeof APP.controller !== 'undefined') ? APP.controller : {};

APP.config = {
    DEFAULT_PALETTE_COLORS: ['B04141', '85224A', 'EBE3B2', '1A4F6B', '042B4F'],
    MAX_COLORS: 10,
    DEFAULT_PALETTE_TITLE: "default",
    DEFAULT_COLOR_PANEL_INDEX: 0,
    DEFAULT_BRUSH_WIDTH: 25,
    LARGE_BRUSH_WIDTH: 25,
    SMALL_BRUSH_WIDTH: 10,
    DEFAULT_BRUSH_SIZE: "large",
    CANVAS_WIDTH: 1000,
    CANVAS_HEIGHT: 1000,
    CANVAS_BACKGROUND_COLOR: "#eee"
};

APP.util = (function() {
    
    // PRIVATE METHODS
    
    var isArray = function( obj ) {
        return Object.prototype.toString.call( obj ) === "[object Array]";
    };

    // keyList returns an array of all property names in an object.

    var keyList = function( obj ) {
        var k, obj;
        var list = [];
        for (k in obj) {
            if (obj.hasOwnProperty( k )) {
                list.push( k );
            }
        }
        return list;
    };

    // PUBLIC METHODS
    
    // copyProps is like jQuery.extend, except that it lacks 
    // jQuery.extend's ability to copy from more than one object. 
    // Also, it has an ability that jQuery.extend doesn't have, 
    // which is to select a list of properties from the source object,
    // instead of automatically copying all of them.

    // The target argument is mandatory, just like in jQuery.extend.

    // The array in the arguments list contains the list of properties to be
    // copied from the source to the target. This array is only for selecting a subset
    // of the top-level primitives and object references in the source object.
    // If the copying is deep (the default), once the recursive calls begin, 
    // objects and arrays are copied with all of their properties, 
    // just as jQuery.extend would do. 

    // The last two arguments, deep and arrayOfProps, are optional and can
    // be in any order.

    var copy = function copy( target, source /* optional args: arrayOfProps, deep */ ) {
        var key, value;
        var toStr = Object.prototype.toString;
        var i;
        var arrayOfProps = []; // optional argument 
        var deep;              // optional argument

        // Assign the optional arguments arrayOfProps and deep.

        deep = (typeof arguments[2] === "boolean") ? arguments[2] :
            (typeof arguments[3] === "boolean") ? arguments[3] : 
            true; // default is deep copy

        arrayOfProps = (isArray( arguments[2] )) ? arguments[2] :
            (isArray( arguments[3] )) ? arguments[3] :
            keyList( source ); // default is copy all of source's properties

        i = arrayOfProps.length;

        while (i) {
            i -= 1;
            key = arrayOfProps[i];
            if (deep && (typeof source[key] === "object")) {
                target[key] = (isArray( source[key] )) ? [] : {};
                copy( target[key], source[key] );
            } else {
                target[key] = source[key];
            }
        }
    };

    var parseSQLDate = function( str ) {
        
        // Split timestamp into [ Y, M, D, h, m, s ]
        var t = str.split(/[- :]/);

        // Apply each element to the Date function
        var d = new Date(t[0], t[1]-1, t[2], t[3], t[4], t[5]);

        return d;
    };

    // object is an object inheritor function. 

    var object = function ( o, vals ) {
        function F() {};
        F.prototype = o;
        var instance = new F();            
        for (var p in vals) {
            instance[p] = vals[p];
        }
        return instance;
    };

    // ------------ Module interface ------------------------

    return {
        copy: copy,
        parseSQLDate: parseSQLDate,
        object: object,
    };
})();


APP.model = (function() {
    
    var util = APP.util;
    var config = APP.config;

    var BrushStyle,
        brushChildrenProto;

    var Palettes, palettes,
        CurrentPalette, currentPalette,
        CurrentBrush, currentBrush;
        
    var init;

    // --- A note about Palettes, CurrentPalette and CurrentBrush:

    // These constructors are designed to have only one instance each,
    // for each instance of this app. The properties of these objects
    // will be reset each time something changes.

    // If I get around to setting this up where there can be more than
    // one instance of the app on the same page (as an exercise),
    // then there will be multiple instances created from these constructors.
    

    // --- Now set up the BrushStyle constructor -----
    //

    BrushStyle = function( color, width ) {
        this.color = '#' + color;
        this.width = width || config.DEFAULT_BRUSH_WIDTH;
        this.lineCap = 'round';
        this.lineJoin = 'round';
    };

    BrushStyle.prototype.toString = function() {
      var state = "{" +
          "color: " + this.color + ", " +
          "width: " + this.width + ", " +
          "lineCap: " + this.lineCap + ", " +
          "lineJoin: " + this.lineJoin +    
      "}";
      return state;
    }

    brushChildrenProto = new BrushStyle();
    

    // --- Set up the CurrentPalette constructor, whose instances',
    // --- own properties are all the Brushstyle children.

    CurrentPalette = function( title, colors, maxColors ) {              
        this.init( title, colors, maxColors );
    };

    // Load in a new palette of colors. 

    CurrentPalette.prototype.init = function( title, colors, maxColors ) {
        
        var i, len;
        var color;
        var small, large;

        this.brushStyles = [];

        // We can only fit maxColors number of panels,
        // so truncate the array if necessary. 

        colors = colors.slice( 0, maxColors );
    
        for (i = 0, len = colors.length; i < len; i++) {
            color = '#' + colors[i];
            small = util.object( brushChildrenProto, {
                color: color,
                width: config.SMALL_BRUSH_WIDTH
            });
            large = util.object( brushChildrenProto, {
       	        color: color,
       	        width: config.LARGE_BRUSH_WIDTH
       	    });

            this.brushStyles.push( small );
            this.brushStyles.push( large );
        }
        
        this.title = title;
        this.colors = colors;
    };


    // --- Set up the current brush.

    CurrentBrush = function( size, colorPanelIdx ) {
        this.styleIdx = (colorPanelIdx * 2) + (size === "large" ? 1 : 0);
    };

    // styleIdx is a number that has two values
    // for every one that colorPanelIdx has,
    // because styleIdx takes into account
    // whether a brush is small or large.

    // styleIdx is a property of each CurrentBrush
    // instance. size, colorPanelIdx and style are all 
    // derived from it when needed.

    // Perhaps styleIdx should be private, because it's never
    // meant to be read or written directly, but that seemed
    // like too much of a pain, because then I would have had
    // to create getter and setter methods for it just so the 
    // prototype methods could use it.
    

    // And now, a series of functions that are both getters and setters,
    // depending on the number of arguments.

    CurrentBrush.prototype.size = function( size /* optional */) {
        var oldSize = (this.styleIdx % 2) ? "large" : "small";
    
        // get
        if (arguments.length === 0) {
            return oldSize;
        
        // set
        } else {
            this.styleIdx += (oldSize === size) ? 0 : 
                             (size === "small") ? -1 : 1;
        }
    }

    CurrentBrush.prototype.colorPanelIdx = function( colorPanelIdx /* optional */) {
        var oldColorPanelIdx = Math.floor( this.styleIdx / 2 );
    
        // get
        if (arguments.length === 0) {
            return oldColorPanelIdx;
        
        // set        
        } else {
            this.styleIdx += (colorPanelIdx - oldColorPanelIdx) * 2;
        }
    }

    CurrentBrush.prototype.style = function() {
        
        // size and colorPanelIdx are both optional arguments 
        //and can be in either order.
        var size, colorPanelIdx;
    
        // get
        if (arguments.length === 0) {
            return currentPalette.brushStyles[ this.styleIdx ];
    
        // set
        } else {
        
            // Figure out optional arguments.
        
            size = (typeof arguments[0] === "string") ? arguments[0] :
                (typeof arguments[1] === "string") ? arguments[1] :
                null;
               
            colorPanelIdx = (typeof arguments[0] === "number") ? arguments[0] :
                (typeof arguments[1] === "number") ? arguments[1] :
                null;
        
            // Between the arguments and the CurrentBrush instance properties,
            // whichever exist, bring the others up to speeed.
        
            if (size !== null) {
                this.size( size );
            } else {
                size = this.size();
            }
        
            if (colorPanelIdx !== null) {
                this.colorPanelIdx( colorPanelIdx );
            } else {
                colorPanelIdx = this.colorPanelIdx();
            }
        
            // this.styleIdx should now be updated and accurate.
        
            console.log( "colorPanelIdx: " + colorPanelIdx );
            console.log( "size: " + size );
            console.log( "this.styleIdx: " + this.styleIdx );
            console.log( "currentPalette.brushStyles[ this.styleIdx ].toString(): " + 
                         currentPalette.brushStyles[ this.styleIdx ].toString() );
            console.log("\n");
        }
    };
    

    // Palettes objects are the objects into which we'll be adding the data from
    // colourlovers.com. (There's only one instance created by the Palettes constructor
    // in the current version of the app.) 
    
    // The Palettes constructor prototype contains a method to load the data.
    // Each palettes object contains a string with the search keywords and 
    // an array with the returned data.
     
    // After we add properties on the fly it will look like this:

    // palettes = { 
    //   keywords: 'summer apple tree',
    //   data: [
    //     { imageUrl: 'http://myimage.jpg',
    //       title: 'my palette',
    //       userName: 'richard', 
    //       dateCreated: 'July 4, 1545', 
    //       description: 'this is my palette',
    //       colors: ['B04141', '85224A', 'EBE3B2', '1A4F6B', '042B4F']
    //     },
    //     { imageUrl: 'http://myotherimage.jpg',
    //       title: 'my other palette',
    //       userName: 'harrington', 
    //       dateCreated: 'July 9, 1970', 
    //       description: 'this is my otherpalette',
    //       colors: ['B04141', '85224A', 'EBE3B2', '1A4F6B', '042B4F']
    //     },
    //   ]
    // }
    

    // This function does a deep copy of data from the feed
    // downloaded from the colourlovers website into the palettes object.
    
    Palettes = function() {};

    Palettes.prototype.load = function( data ) {
        if (!data || data.length === 0) {
            return false;
        }
        
        var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
        var i, len;
        var date;
        var self = this;
        
        this.data = [];
        
        for (i = 0, len = data.length; i < len; i++) {
            (function( idx ) {
                var entry;
                var desc;
                var newPalette = {};
                console.log(idx);

                entry = data[idx];

                util.copy( newPalette, entry, [
                    "colors", 
                    "imageUrl", 
                    "title", 
                    "userName", 
                    "description", 
                    "dateCreated"] ); // omitting last argument
                                      // makes it a deep copy
                                          
                // Now make "dateCreated" a more readable string.
            
                date = util.parseSQLDate( newPalette.dateCreated );
                newPalette.dateCreated = MONTHS[date.getMonth()] + " " + 
                                         date.getDate() + ", " + 
                                         date.getFullYear();
            
                // Many of the descriptions on colourlovers.com
                // are long garbage strings of html, so exclude those.
            
                desc = newPalette.description;
                newPalette.description = (desc.length < 200) ? desc : "";
            
                // Load the new palette into the main database object.
            
                self.data[idx] = newPalette;
            
            }( i ));
        }
        return true;
    };
    
    init = (function() {
        
        // Initialize palettes.
        palettes = new Palettes();

        // Initialize currentPalette.
        currentPalette = new CurrentPalette( config.DEFAULT_PALETTE_TITLE, config.DEFAULT_PALETTE_COLORS, config.MAX_COLORS );

        // Initialize currentBrush.
        currentBrush = new CurrentBrush( config.DEFAULT_BRUSH_SIZE, config.DEFAULT_COLOR_PANEL_INDEX );
    })();


    //----------- MODULE INTERFACE ----------------
    
    return {
        Palettes: Palettes,
        palettes: palettes,
        CurrentPalette: CurrentPalette,
        currentPalette: currentPalette,
        CurrentBrush: CurrentBrush,
        currentBrush: currentBrush,
        init: init
    };  
})();



// ------------------ VIEW --------------------------

APP.view = (function() {
    
    var model = APP.model;
    var config = APP.config;
    
    var TheStatus, theStatus,
        Canvas, canvas,
        ColorPanels, colorPanels,
        PalettesColumn, palettesColumn,
        init;

    // ------------------ Status reporting mechanism. --------------------------
    
    // (would be called "Status," but one of the browsers
    // doesn't like that. I forget which one.)

    TheStatus = function( element ) {
        this.jQelement = $( element );
    };

    TheStatus.prototype.report = function( str ) {  

        // If we've got something to report
        if (arguments.length) {
            this.jQelement.text( str );

        // No news is good news.
        } else {
            this.jQelement.html( '&nbsp;' );
        }

    }

    // --------------------- Wrapper for DOM Canvas ----------------------------

    Canvas = function( DOMelement, width, height, backgroundColor, brushStyle, colorPanelIdx ) {
        var borderLeftPx = (window.getComputedStyle) ? 
                            window.getComputedStyle( DOMelement, null )['border-left-width'] :
                            element.currentStyle.border; // TODO: check in IE6, IE7, IE8
                            
        this.DOMElement = DOMelement;
        this.context = DOMelement.getContext( "2d" );
        this.width = width;
        this.height = height;
        this.backgroundColor = backgroundColor;

        this.border = (borderLeftPx) ? parseInt(borderLeftPx, 10) : 16;
        this.drawing = false;
        
        this.applyStyle( brushStyle, colorPanelIdx );
        this.clear();
    }

    Canvas.prototype.getMousePos = function( event ) {
        event = event || window.event; // This is for IE's global window.event

        var r = this.DOMElement.getBoundingClientRect();
        var coords = {
            x : event.clientX - r.left - this.border,
            y : event.clientY - r.top - this.border
        };
        return coords;
    }

    Canvas.prototype.applyStyle = function( brushStyle, colorPanelIdx ) {
        var c = this.context;
        
        c.lineWidth = brushStyle.width;
        c.strokeStyle = brushStyle.color;
        c.lineCap = brushStyle.lineCap;
        c.lineJoin = brushStyle.lineJoin;
    }

    Canvas.prototype.startStroke = function( x, y ) {
        var c = this.context;

        // save fillStyle on stack
        var savedFillStyle = c.fillStyle;

        // draw a dot the diameter of the brush
        var r = c.lineWidth / 2;
        c.fillStyle = c.strokeStyle;
        c.beginPath();
        c.moveTo( x, y );
        c.arc( x, y, r, 0, Math.PI * 2 );
        c.fill();

        // finish up, restore fillStyle and start new path
        c.beginPath();
        c.moveTo( x, y );
        c.fillStyle = savedFillStyle;

    };

    Canvas.prototype.stroke = function( x, y ) {
        var c = this.context;

        c.lineTo( x, y );
        c.stroke();
    };

    Canvas.prototype.clear = function( color ) {
        var c = this.context;
        color = color || this.backgroundColor;

        c.fillStyle = color;
        c.fillRect( 0, 0, this.width, this.height );
    };
    
    // -------------------- wrapper for DOM color panels --------------------------
    
    ColorPanels = function( DOMcolorContainer, DOMtitleSpan, title, colors ) {
        this.DOMcolorContainer = DOMcolorContainer;
        this.DOMtitleSpan = DOMtitleSpan;
        this.populate( title, colors );
        $( DOMcolorContainer ).find( )
    };
    
    ColorPanels.prototype.populate = function( title, colors ) {
        var i, len;
        var color;
        var elementIds = [];
        
        var jQcolorContainer = $( this.DOMcolorContainer );
        var jQtitleSpan = $( this.DOMtitleSpan );
    
        for (i = 0, len = colors.length; i < len; i++) {
            elementIds.push( {id: 'color-' + (i + 1)} );
        }

        // Now empty the old color panels, then load the new ones 
        // into the DOM. Create the div tags with the 
        // jQuery template, then add background colors and 
        // click handlers.
        
        // THIS SHOULD BE CHANGED TO RE-BACKGROUND-COLORING
        // WHAT WAS ALREADY THERE, INSTEAD OF EMPTYING AND RE-DRAWING. 
        // THAT WAY WE DON'T HAVE TO RESELECT THE ONE WITH THE PINK BORDER.

        jQcolorContainer.empty();
        jQtitleSpan.text( title );

        $( "#currentPaletteTemplate" ).
                tmpl( elementIds ).
                appendTo( jQcolorContainer ).
                each( function( elementIndex ) {
                    this.style.backgroundColor = '#' + colors[elementIndex];

                    this.onclick = (function( i ) {
                        return function() {
                                                        
                            var jQElement = jQcolorContainer.find( '#color-' + (i + 1) );

                            // Highlight color panel
                            jQElement.addClass( 'selected' );

                            // Un-highlight all others
                            jQElement.siblings().removeClass( 'selected' );
                            
                            // Update currentBrush and canvas.
                            model.currentBrush.style( i );
                            canvas.applyStyle( model.currentBrush.style(), i );
                        };
                    })( elementIndex );
                });
                
        // Now make the selected one pink.
        
        jQcolorContainer.find( '#color-' + (model.currentBrush.colorPanelIdx() + 1) ).addClass( 'selected' );
    };
    
    // -------------------- wrapper for DOM palettes column --------------------------
    
    PalettesColumn = function( DOMcontainer ) {
        this.DOMcontainer = DOMcontainer;
    };
    
    PalettesColumn.prototype.populate = function( palettes ) {
        
        // In the left column, show the heading with the keywords, and all the palettes below it,
        // along with their click handlers for loading colors into the drawing program.
    
        var jQcontainer = $( this.DOMcontainer );
    
        jQcontainer.find( '#successfulKeywords' ).text( palettes.keywords );
        jQcontainer.find( '#palettesFound' ).show();
    
        jQcontainer.find( '#paletteList' ).empty();
        $( '#palettesTemplate' ).
                tmpl( palettes.data ).
                appendTo( jQcontainer.find( '#paletteList' )).
                each( function( paletteIndex ) {
                    this.onclick = function() {
                    
                        var title = model.palettes.data[paletteIndex].title;
                        var colors = model.palettes.data[paletteIndex].colors;
                    
                        var style, colorPanelIdx;
                    
                        model.currentPalette.init( title, colors );
                        colorPanels.populate( title, colors );
                    
                        // Now that we have loaded currentPalette
                        // with the new colors, invoking currentBrush.style()
                        // will give access to the correct style information
                        // in currentPalette.
                    
                        style = model.currentBrush.style();
                        colorPanelIdx = model.currentBrush.colorPanelIdx();
                    
                        canvas.applyStyle( style, colorPanelIdx );
                    
                        // turn the palette thumbnail pink
                    
                        jQcontainer.find( '#paletteList .selected' ).removeClass( 'selected' );
                        $( this ).find( 'img' ).addClass( 'selected' );
                     
                    };
                });
    
        jQcontainer.show();
    };
    
    init = (function() {
        
        // Initialize status reporting.
        theStatus = new TheStatus( document.getElementById( 'statusReport' ) );
        
        // Initialize canvas.
        canvas = new Canvas( document.getElementById( 'canvas' ), config.CANVAS_WIDTH, config.CANVAS_HEIGHT, 
                             config.CANVAS_BACKGROUND_COLOR, model.currentBrush.style(), config.DEFAULT_COLOR_PANEL_INDEX );
        
        // Load the colors into the DOM.
        colorPanels = new ColorPanels ( $( 'div.color-container' )[0], $( '#currentPaletteTitle' )[0], 
                                           config.DEFAULT_PALETTE_TITLE, config.DEFAULT_PALETTE_COLORS );
                                           
        // Initialize empty palettesColumn object.
        palettesColumn = new PalettesColumn( $( 'div.left-column' ) );
        
    })();
    
    // ---- Module interface -----

    return {
        TheStatus: TheStatus,
        theStatus: theStatus,
        Canvas: Canvas,
        canvas: canvas,
        ColorPanels: ColorPanels,
        colorPanels: colorPanels,
        PalettesColumn: PalettesColumn,
        palettesColumn: palettesColumn,
        init: init
    };
})();

APP.controller = (function() {
    
    var config = APP.config,
        model = APP.model,
        view = APP.view;

    var currentPalette = model.currentPalette,
        currentBrush = model.currentBrush,
        palettes = model.palettes,

        theStatus = view.theStatus,
        canvas = view.canvas,
        colorPanels = view.colorPanels,
        palettesColumn = view.palettesColumn;
        
    var requestFromColourloversAPI;
    var loadPalettes;
    
    var init;
    
    // -- the event handler for requesting data from colourlovers.com
    
    requestFromColourloversAPI = function() {
        var encodedKeywords;
        var colourLoverScript;
        var keywords = $( '#searchField' ).val();

        // if the user typed anything
        if (keywords) {
            $( '#searchField' ).val( '' );
                        
            theStatus.report( "Loading..." );

            // Create the script tag that makes the http request to Colourlovers.com. 
            // But first overwrite any previous script tags 
            // with the id 'colourLoversUrl', after checking to see whether they exist.
            // We do this tag replacement (instead of adding new tags every time) 
            // partly just to keep the tags from piling up,
            // and partly to prevent the DOM from having tags with the same id.
      
            if ( $( '#colourLoversUrl' ).length > 0 ) {
                $( '#colourLoversUrl' ).remove();
            }
            colourLoversScript = document.createElement( 'script' );
        	colourLoversScript.id = 'colourLoversUrl';
            document.getElementsByTagName( 'head' )[0].appendChild( colourLoversScript );
      
            // Change spaces to plus signs for insertion into search query.
            // This query string tells colourlovers.com to pass back the data wrapped
            // in our callback function, palettes.load()
        
            encodedKeywords = keywords.replace( /\s+/g, '+' );
            colourLoversScript.setAttribute( 'src', 
                    'http://www.colourlovers.com/api/palettes?keywords=search+' + encodedKeywords + 
                    '&jsonCallback=APP.controller.loadPalettes' );
        }
        return false;
    };
    
    loadPalettes = function( data ) {
        if (palettes.load( data )) {
            theStatus.report();   // no arguments means all clear, no errors to report.  
            palettesColumn.populate( palettes );
        } else {
            theStatus.report( 'No palettes matched the keyword or keywords "' + this.keywords + '." Try again.' );
        };
        
    };


    // the init will eventually be broken up into two parts: one for everything
    // that gets executed only once when the user goes to this URL or refreshes 
    // their browser, and the other one for every time a new instance of 
    // the drawing app is created on the page.

    init = function() {
        var code;
        var colors;
        var i, len;
        
        
        // Set brush size HTML select element, 
        // because Firefox preserves state even when it's refreshed.
        $( '#brushSize' ).val( currentBrush.size() );  

        // ------ EVENT HANDLERS. ---------------------        
        
        // bind the event handlers for clearing the screen, 
        // toggling the brush size and entering search keywords.

        $( '#clearCanvas' ).click( function() {
            canvas.clear( config.CANVAS_BACKGROUND_COLOR );
        });

        $( '#brushSize' ).change( function() {
            currentBrush.style( this.value );
            canvas.applyStyle( currentBrush.style(), currentBrush.colorPanelIdx() );
        });        

        $( '#searchButton' ).click( function() {
            requestFromColourloversAPI( palettes );
        });
        $( '#searchField' ).keydown( function( event ) {

            // cross-browser compliance for different keydown event key code property names
    
            code = event.keyCode || event.which;
            if (code == 13) {
                event.preventDefault();
                requestFromColourloversAPI( palettes );
            }
        });

        // Set up error handlers for all current and future cases of 
        // the manual script tag that downloads the data from colourlovers
        // (using jQuery .delegate()).
        // Also, for the specialized case of when the error handler cannot
        // be bound to the script element (it seems to work on all browsers, but many
        // fairly recent posts on the Internet say this handler can only be bound
        // to the window object or to an img element), we have as a fallback a
        // generic error handler on the window object if anything goes wrong on the page at all.

        try {
            $( document ).delegate('#colourLoversUrl', 'error', function () {

                // extract the search string from the colourlovers.com request url.
                var keywords = $(this).attr('src').replace(/(.*?keywords=search+)(.*?)(&.*)/, '$2');
                theStatus.report( 'Unable to load palettes for the keywords ' + keywords + '."' );
            });
    
        } catch ( e ) {

            if (window.addEventListener) {
                window.addEventListener('error', function () {
                    theStatus.report( "There's been a nebulous problem of some sort." );
                }, false);

            } else if (window.attachEvent) {
                window.attachEvent('error', function () {
                    theStatus.report( "There's been a nebulous problem of some sort, probably IE-related." );
                });
            }
        }

        //========== Canvas events ==============

        canvas.DOMElement.onmousedown = function( event ) {
            var p = canvas.getMousePos( event );
            canvas.startStroke( p.x, p.y );
            canvas.drawing = true;
        };

        canvas.DOMElement.onmousemove = function( event ) {
            var p = canvas.getMousePos( event );

            if (canvas.drawing) {
                canvas.stroke( p.x, p.y );
            }
        };

        canvas.DOMElement.onmouseup = function( event ) {
            canvas.drawing = false;
        };
        
    };
    
    //----------- module interface -----------------
    
    return {
        loadPalettes: loadPalettes,
        init: init
    };
})();

$( document ).ready( function () {
    APP.controller.init();
});

