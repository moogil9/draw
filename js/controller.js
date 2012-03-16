// Dependencies: util.js, model.js, view.js

;

var APP = (typeof APP !== 'undefined') ? APP : {};
APP.controller = (typeof APP.controller !== 'undefined') ? APP.controller : 

(function() {
    
    var util = APP.util;

    var requestFromColourloversAPI;
    var loadPalettes;
    
    var setMiscellaneousUserControls;
    var setErrorControls;
    var setCanvasControls;
    
    var ElementsController;
    var colorPanelsController;
    var palettesColumnController;
    
    var init;
    
    // -- the event handler for requesting data from colourlovers.com
    
    requestFromColourloversAPI = function( instanceNumber ) {
        var model = APP.model.instances[instanceNumber];
        var view = APP.view.instances[instanceNumber];
        
        var encodedKeywords;
        var colourLoversScript;
        var searchURL;
        
        var pageId = 'page-' + instanceNumber;
        var pageSelector = '#' + pageId;
        var searchField = $( pageSelector + ' .search-field' );
        var keywords = searchField.val();

        // if the user typed anything
        if (keywords) {
            model.palettes.keywords = keywords;
            searchField.val( '' );
                        
            view.theStatus.report( "Loading..." );

            // First overwrite any previous script tags with the class 'colourLoversUrl',
            // than create the new one that makes the next http request to colourlovers.com.
      
            if ( $( pageSelector + ' .colourLoversUrl' ).length > 0 ) {
                $( pageSelector + ' .colourLoversUrl' ).remove();
            }
            colourLoversScript = document.createElement( 'script' );
        	$( colourLoversScript ).addClass( 'colourLoversUrl' );
            document.getElementById( pageId ).appendChild( colourLoversScript );
      
            // Change spaces to plus signs for insertion into search query.
            // This query string tells colourlovers.com to pass back the data wrapped
            // in our callback function, palettes.load()
        
            encodedKeywords = keywords.replace( /\s+/g, '+' );
            searchURL = 'http://www.colourlovers.com/api/palettes?keywords=search+' + encodedKeywords + 
                        '&jsonCallback=APP.controller.loadPalettes[' + instanceNumber + ']'
            colourLoversScript.setAttribute( 'src', searchURL);
        }
        return false;
    };
    
    // Remember: PropertyToParameter will create a hash (loadPalettes) whose values are functions
    // that, when called, take their own property names, add them to the front of the argument
    // list that was passed to them, and then call the anonymous function that was originally passed
    // to the constructor. The anonymous function is invoked with the new, extended argument list.
    
    loadPalettes = new util.PropertyToParameter( function( instanceNumber, data ) {
        var model = APP.model.instances[instanceNumber];
        var view = APP.view.instances[instanceNumber];
        
        if (model.palettes.load( data )) {
            palettesColumnController.init( instanceNumber );
            view.theStatus.report();   // no arguments means all clear, no errors to report.  
        } else {
            view.theStatus.report( 'No palettes matched the keyword or keywords "' + 
                                    model.palettes.keywords + '." Try again.' );
        };
    });

    setErrorControls = function( instanceNumber ) {
        // Set up error handlers for all current and future cases of 
        // the manual script tag that downloads the data from colourlovers
        // (using jQuery .delegate()).
        
        var view = APP.view.instances[instanceNumber];
        var pageSelector = '#page-' + instanceNumber;

        var keywords;

        $( pageSelector ).delegate(' .colourLoversUrl', 'error', function () {

            // extract the search string from the colourlovers.com request url.
            keywords = $( this ).attr( 'src' ).replace( /(.*?keywords=search\+)(.*?)(&.*)/, '$2' );
            
            // unescape (changes plusses to spaces)
            keywords = keywords.replace( /\+/g, ' ' );
            
            view.theStatus.report( 'Unable to load palettes for the keyword or keywords "' + keywords + '." ' +
                                   'Probably your internet is down.' );
        });
    };
    
    setMiscellaneousUserControls = function( instanceNumber ) {
        var model = APP.model.instances[instanceNumber];
        var view = APP.view.instances[instanceNumber];
        
        var pageSelector = '#page-' + instanceNumber;
        var code;
        
        // Set brush size HTML select element, 
        // because Firefox preserves state even when it's refreshed.
        $( pageSelector + ' .brush-size' ).val( model.currentBrush.size() );  

        // bind the event handlers for clearing the screen, 
        // toggling the brush size and entering search keywords.

        $( pageSelector + ' .clear-canvas' ).click( function() {
            view.canvas.clear();
        });

        $( pageSelector + ' .brush-size' ).change( function() {
            model.currentBrush.size( this.value );
            view.canvas.applyStyle( model.currentBrush.style() );
        });        

        $( pageSelector + ' .search-button' ).click( function() {
            requestFromColourloversAPI( instanceNumber );
        });
        $( pageSelector + ' .search-field' ).keydown( function( event ) {

            // cross-browser compliance for different keydown event key code property names
    
            code = event.keyCode || event.which;
            if (code == 13) {
                event.preventDefault();
                requestFromColourloversAPI( instanceNumber );
            }
        });
    };
    
    setCanvasControls = function( instanceNumber ) {
        var canvas = APP.view.instances[instanceNumber].canvas;

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
    
    // Now set up the controllers for the color panels and the palettes column,
    // which are quite similar so we're going to re-use the code.

    ElementsController = function() {};
    
    // highlightElement operates on either an element and its siblings,
    // or descendants of the top-level element and all the corresponding 
    // descendants of the siblings of the top-level element.
    
    ElementsController.prototype.highlightElement = function( element, descendant ) {
        if (arguments.length === 1) {
            $( element ).addClass( 'selected' );
            $( element ).siblings().removeClass( 'selected' );
        } else {
            $( element ).find( descendant ).addClass( 'selected' );
            $( element ).siblings().find( descendant ).removeClass( 'selected' );
        }
    };
    
    ElementsController.prototype.addEventListeners = function( wrapper, eventHandler ) {
        $( wrapper.DOMContainer ).children().each( function( i ) {
            $( this ).click( function() {
                eventHandler( this, i );
            });
        });
    };
    
    colorPanelsController = new ElementsController();
    
    colorPanelsController.init = function( instanceNumber ) {
        var model = APP.model.instances[instanceNumber];
        var view = APP.view.instances[instanceNumber];
        var pageSelector = '#page-' + instanceNumber;
        
        var panel;
        
        // Populate the color panels.
        view.colorPanels.populate( model.currentPalette.title, model.currentPalette.colors ); 
        
        // Reset the currentBrush's colorPanelIdx if it was set to a panel that no longer
        // exists (because a new palette has fewer colors than the old one)
        if (!model.currentBrush.style()) {
            model.currentBrush.colorPanelIdx( 0 );
        }
        
        // Set the canvas to the right style.
        view.canvas.applyStyle( model.currentBrush.style() );

        // Now make the already selected one pink.
        panel = $( pageSelector + ' .' + view.colorPanels.getDOMElmntClass( model.currentBrush.colorPanelIdx()) );
        this.highlightElement( panel );

        // Add the event listeners.
        this.addEventListeners( view.colorPanels, function( element, i ) {
            
            // Update currentBrush and canvas.
            model.currentBrush.colorPanelIdx( i );
            view.canvas.applyStyle( model.currentBrush.style() );
            
            // Turn the selected one pink.
            colorPanelsController.highlightElement( element );
        });
    };

    palettesColumnController = new ElementsController();
    
    palettesColumnController.init = function( instanceNumber ) {
        var model = APP.model.instances[instanceNumber];
        var view = APP.view.instances[instanceNumber];
        var pageSelector = '#page-' + instanceNumber;
                
        // Populate the palettes column.
        view.palettesColumn.populate( model.palettes );
        
        // Adjust its height based on the height of the canvas.
        // TODO: Find a way to have this not happen, using CSS.
        // For one thing, we're 'illegally' using the private property view.canvas._height
        $( view.palettesColumn.DOMContainer ).parent().css( 'height', '' + (305 + view.canvas._height) );
        
        // Widen the left column.
        $( view.palettesColumn.DOMContainer ).parent().css( {'width': '220px', 'margin-left': '15px'} );
        
        
        // Slide the main box over.
        $( pageSelector + ' .main-box-wrapper' ).css ( 'margin-left', 240 );
        
        // Add the event handlers.
        this.addEventListeners( view.palettesColumn, function( element, i ) {
            
            // Load the currentPalette with the new colors.
            var title = model.palettes.data[i].title;
            var colors = model.palettes.data[i].colors;
            model.currentPalette.load( title, colors );
            colorPanelsController.init( instanceNumber );
            
            // Turn the selected one pink.
            palettesColumnController.highlightElement( element, ".palette-image" );
        });        
    };
    
    // -------------------- CONTROLLER INIT --------------------------

    init = function() {

        var config;
        
        var i, len;
        var pageSelector;
        var instanceNumberList = [];
        var modelInstances = APP.model.instances;
        
        // Create the main html blocks. Need to use the APP.model module
        // to count the instances because that's where the instances
        // array is predefined with config information, and exposed to the module
        // interface. The view instances array is also exposed but it is
        // empty until APP.view.init() is run.
        
        for (i = 0, len = modelInstances.length; i < len; i++) {
            instanceNumberList.push( {instanceNum: i} );
        }
        $( '#pageTemplate' ).tmpl( instanceNumberList ).appendTo( 'body' );
        
        for (i = 0, len = modelInstances.length; i < len; i++) {
            config = modelInstances[i].config;
            
            APP.model.init();
            
            APP.view.init({ 
                canvasWidth:            config.CANVAS_WIDTH, 
                canvasHeight:           config.CANVAS_HEIGHT, 
                canvasBackgroundColor:  config.CANVAS_BACKGROUND_COLOR, 
                colorPanelIdx:          config.DEFAULT_COLOR_PANEL_INDEX,
                paletteTitle:           config.DEFAULT_PALETTE_TITLE, 
                paletteColors:          config.DEFAULT_PALETTE_COLORS,
                brushStyle:             modelInstances[i].currentBrush.style() 
            });
            
            setMiscellaneousUserControls( i );
            setErrorControls( i );
            setCanvasControls( i );
            colorPanelsController.init( i );
            
            loadPalettes.add( i );
        }
        $( 'body' ).css('display', 'block');
    };
    
    //----------- module interface -----------------
    
    return {
        
        // We need init right now.
        // We might need the rest of this stuff in a later version of this app.

        requestFromColourloversAPI: requestFromColourloversAPI,
        loadPalettes: loadPalettes,

        setMiscellaneousUserControls: setMiscellaneousUserControls,
        setErrorControls: setErrorControls,
        setCanvasControls: setCanvasControls,

        colorPanelsController: colorPanelsController,
        palettesColumnController: palettesColumnController,

        init: init
    };
})();

$( function () {
    APP.controller.init();
});

