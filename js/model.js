// Dependency: util.js, config.js

;

var APP = (typeof APP !== 'undefined') ? APP : {};
APP.model = (typeof APP.model !== 'undefined') ? APP.model : 

(function() {
    
    var util = APP.util;
    var config = APP.config;

    var BrushStyle,
        brushChildrenProto;

    var Palettes,
        CurrentPalette,
        CurrentBrush;
        
    var init;
    var instanceNumber = 0;

    // The 'instances' array will have other properties added dynamically to its element
    // objects. We start with "config," which contains all the information from the config.js
    // file. Later we'll add "currentBrush," "currentPalette," and "palettes."
    
    var instances = [];
    var i, k, len;
    
    for (i = 0, len = config.length; i < len; i += 1) {
        instances[i] = {};
        instances[i].config = {};
        for (k in config[i]) {
            if (config[i].hasOwnProperty( k )) {
                instances[i].config[k] = config[i][k]
            }
        }
    }


    // --- A note about Palettes, CurrentPalette and CurrentBrush:

    // There is one instance each of each of these objects for each
    // instance of the app on the page. An array with the default settings
    // for each instance can be found in the config.js file.    

    // --- Set up the BrushStyle constructor -----

    BrushStyle = function( color, width ) {
        this.color = color;
        this.width = width;
    };
    
    // We always have the option of making lineCap and lineJoin instance
    // variables in the future, but for now let's put them in the prototype.
    
    BrushStyle.prototype.lineCap = 'round';
    BrushStyle.prototype.lineJoin = 'round';

    BrushStyle.prototype.toString = function() {
      return "{" +
          "color: " + this.color + ", " +
          "width: " + this.width + ", " +
          "lineCap: " + this.lineCap + ", " +
          "lineJoin: " + this.lineJoin +    
      "}";
    }

    brushChildrenProto = new BrushStyle();
    
    // --- Set up the CurrentPalette constructor, whose instances',
    // --- own properties are all the Brushstyle children.

    CurrentPalette = function( title, colors, maxColors, smallBrushWidth, largeBrushWidth ) { 
        this.maxColors = maxColors;
        this.smallBrushWidth = smallBrushWidth;
        this.largeBrushWidth = largeBrushWidth;             
        this.init( title, colors );
    };

    // Load in a new palette of colors. 

    CurrentPalette.prototype.init = function( title, colors, maxColors, smallBrushWidth, largeBrushWidth ) {
        
        var i, len;
        var color;
        var small, large;
        
        this.brushStyles = [];

        // We can only fit this.maxColors number of panels,
        // so truncate the array if necessary. 

        colors = colors.slice( 0, this.maxColors );
    
        for (i = 0, len = colors.length; i < len; i++) {
            color = colors[i];
            small = util.object( brushChildrenProto, {
                color: color,
                width: this.smallBrushWidth
            });
            large = util.object( brushChildrenProto, {
       	        color: color,
       	        width: this.largeBrushWidth
       	    });

            this.brushStyles.push( small );
            this.brushStyles.push( large );
        }
        
        this.title = title;
        this.colors = colors;
    };


    // --- Set up the current brush.

    CurrentBrush = function( size, colorPanelIdx, currPalette ) {
        this.currentPalette = currPalette;
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
    

    // size and colorPanelIdx are both getters and setters,
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
    
    // style is a getter only.
    
    CurrentBrush.prototype.style = function() {
        return this.currentPalette.brushStyles[ this.styleIdx ];
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
                // are long garbage strings of html, so exclude those
                // by checking if the string is too long.
            
                desc = newPalette.description;
                newPalette.description = (desc.length < 200) ? desc : "";
            
                // Load the new palette into the main database object.
            
                self.data[idx] = newPalette;
            
            }( i ));
        }
        return true;
    };
    
    init = function() {
        var palettes,
            currentPalette,
            currentBrush;
            
        var config = instances[instanceNumber].config;
        
        // Initialize palettes.
        palettes = new Palettes();
        
        // Initialize currentPalette.
        currentPalette = new CurrentPalette( 
            config.DEFAULT_PALETTE_TITLE, 
            config.DEFAULT_PALETTE_COLORS, 
            config.MAX_COLORS,
            config.SMALL_BRUSH_WIDTH, 
            config.LARGE_BRUSH_WIDTH 
        );

        // Initialize currentBrush.
        currentBrush = new CurrentBrush(
            config.DEFAULT_BRUSH_SIZE,
            config.DEFAULT_COLOR_PANEL_INDEX,
            currentPalette 
        );
        
        // Can't just assign the whole object all at once because it's not empty:
        // it contains config information for each instance from the very start.
        instances[instanceNumber].palettes = palettes;
        instances[instanceNumber].currentPalette = currentPalette;
        instances[instanceNumber].currentBrush = currentBrush;
        
        // Increment the main instance number.
        instanceNumber += 1;
    };

    //----------- MODULE INTERFACE ----------------
    
    return {
        init: init, 
        instances: instances
    };  
    
})();
