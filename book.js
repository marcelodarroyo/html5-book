/*=======================================================================================
Book namespace
Description: The Book object controls the rendering of the Book pages. It is a pages
container. Each page contains a set of objects which can be figures and a sound. A figure
can have a movement or can represent a jump to other page.

Internals: 

The book contains an array of pages (Book.pages). 
Each page is an object (see Book.addPage() method)
{
	background: -1, // index of background image in Book.images[] cache
	content: []     // array of images/sprites in page
}

Images/sprites objects are created by Book.addImage() and Book.addSprite() respectivelly
(or loaded from file containing json data, see Book.onFileOpen() and Book.save()).
========================================================================================*/

Book = {
	libro: 'libro1',

    canvas: null,
	
	ctx: null,

	backgroundsGallery: [],

	imagesGallery: [],

	spritesGallery: [],

	audioGallery: [],

	openPropertiesDialog: null,

	mode: 'editing',	// modes: editing - playing

	// pages of Book. This object should be stored somewhere (web storage?)
	pages: [],

	pagesContainer: null,

	// the current page
	currentPage: null,

	// reference to element in current page actually selected in canvas
	currentElement: null,

	// drag and drop management
	draggedImageId: null,		// image (of gallery) dragged 
	draggingFrom: null,			// 'backgrounds', 'images', 'sprites'

	// image is been resizing/rotated
	actionOnElement: '',		// 'moving', 'resizing', 'rotating'

	// For tracking the movement of objects (when this.actionOnElement == 'moving')
	prevPosX: 0,
	prevPosY: 0,

	// Images cache
	images: [],

	// Sound sources
	soundSources: [],

	// Canvas size (%)
	canvasWidth: 80,
	canvasHeight:85,

	// Play buttons
	playBtn: null,
 	stopBtn: null,
	playBtnBackground: null,	// cached background button image (we change it when playing)

	// Book initialization
	init: function (canvas) {
		this.canvas = document.getElementById(canvas);
		if (this.canvas.getContext)
          this.ctx = this.canvas.getContext('2d');

        this.resize();

        if ( ! document.getElementById('0') )
        	// We are in fresh editing mode page
        	this.initGallery();

        this.openPropertiesDialog = document.getElementById('open-properties-dialog');
        this.sounds = document.getElementById('sounds');

        this.pagesContainer = document.getElementById('pages');

        this.playBtn = document.getElementById('play-btn');
    	this.stopBtn = document.getElementById('stop-btn');
        this.playBtnBackground = document.getElementById('play-btn').style.backgroundImage;
        
        this.canvas.addEventListener('mousedown', this.onCanvasMouseDown, false);
	    this.canvas.addEventListener('mouseup', this.onCanvasMouseUp, false);
	    if ( this.mode == 'editing' ) {
		    this.canvas.addEventListener('mousemove', this.onCanvasMouseMove, false);
		    this.canvas.addEventListener('dragover', this.onDragOverCanvas);
	        this.canvas.addEventListener('drop', this.onCanvasDrop);
            document.getElementById('stop-btn').style='display: none;';
    	}
	},

	startInPlayingMode: function () {
		this.canvasWidth = this.canvasHeight = 100;
		this.resize();
		this.hideGalleries();
		this.play();
	},

	hideGalleries: function () {
		gallery.style.display = 'none';
		pagesGallery.style.display = 'none';
	},

	// Resize elements relative to window size
	resize: function () {
		var gallery = document.getElementById('gallery');
		var pagesGallery = document.getElementById('pages-gallery');
		var pagesContainer = document.getElementById('pages');
		var hdr = document.getElementById('pages-header');
		var buttons = document.getElementById('buttons');
		
		Book.canvas.width =  Book.canvasWidth * window.innerWidth / 100;
		Book.canvas.height = Book.canvasHeight * window.innerHeight / 100;

		gallery.style.height = Book.canvas.height + 'px';
		pagesGallery.style.height = Book.canvas.height + 'px';

		pagesContainer.style.height = (Book.canvas.height - buttons.clientHeight - hdr.clientHeight - 39) + 'px';

		if ( Book.currentPage )
			Book.drawPage();
	},

	// Create images in gallery
	initGallery: function () {
		var i;

		for (i = 0; i < this.backgroundsGallery.length; i++)
			this.addImageToGallery("backgrounds", this.backgroundsGallery[i]);

		for (i = 0; i < this.imagesGallery.length; i++)
			this.addImageToGallery("images", this.imagesGallery[i]);

		for (i = 0; i < this.spritesGallery.length; i++)
			this.addImageToGallery("sprites", this.spritesGallery[i].src);
	},

	// Add an image to gallery (backgrounds, images, sprites)
	addImageToGallery: function (gallery, src) {
		// Store original image in cache
		var img = new Image();
		img.src = src;
		this.images.push(img);

		if ( this.mode == 'editing' ) {
			var container = document.getElementById(gallery);

			// Put a copy in gallery
			img = new Image();
			img.id = '' + (this.images.length - 1);
			img.src = src;
			img.draggable = 'true';
			img.crossOrigin = "Anonymous";

			if ( gallery == 'backgrounds' )
				img.addEventListener('dragstart', this.onBackgroundsDragStart, false);
			else if ( gallery == 'images' )
				img.addEventListener('dragstart', this.onImagesDragStart, false);
			else
				img.addEventListener('dragstart', this.onSpritesDragStart, false);
			
			container.appendChild(img);
		}
	},

	//===================================================================================
	// Page miniatures handling
	//===================================================================================
	getCurrentPageMiniature: function () {
		var i = Book.pages.indexOf(Book.currentPage);
		var id = 'page-'+i;
		return document.getElementById(id);
	},
	
	createPageMiniature: function (i) {
		var btn = document.createElement("input");
    	btn.type = "button";
		btn.id = 'page-'+i;
		btn.value = 'Pág.'+(i+1);

		// On click, change current page
		btn.onclick = function () {
			var oldCurrent = Book.getCurrentPageMiniature();
			if ( oldCurrent )
				oldCurrent.classList.remove('current-page');
			btn.classList.add('current-page');
			Book.currentPage = Book.pages[this.id.substring(5)/1];
			Book.drawPage();
		};
		return btn;
	},

    updatePageMiniature: function () {
        var i = Book.pages.indexOf(Book.currentPage);
        var btn = document.getElementById('page-' + i);
        var img = new Image();
        img.onload = function (ev) {    
            btn.style.background = img.src; 
        };
        img.src = this.canvas.toDataURL('image/png');
    },

	// create pages miniatures on pages gallery
	createPagesGallery: function () {
		var current = this.currentPage;
		
		// remove pages miniatures
		while ( this.pagesContainer.firstChild )
			this.pagesContainer.removeChild(this.pagesContainer.firstChild);

		// create miniatures
		for (var i=0; i < this.pages.length; i++) {
			// this.currentPage = this.pages[i];
			// this.drawPage();
			this.pagesContainer.appendChild(this.createPageMiniature(i));
			if ( this.pages.indexOf(current) == i )
				document.getElementById('page-'+i).classList.add('current-page');
		}

		// restore current page
		this.currentPage = current;
		if ( current )
			this.getCurrentPageMiniature().click();
	},

	//===================================================================================
	// Handling object selection in canvas
	//===================================================================================
	windowToCanvasCoord: function (x, y) {
     	var bbox = this.canvas.getBoundingClientRect();
     	return { 
     				x: x - bbox.left * (this.canvas.width  / bbox.width),
                	y: y - bbox.top  * (this.canvas.height / bbox.height)
               };
    },

    // Find if user click on an object in canvas. Return object reference
    selectedObject: function (loc) {
    	if ( ! this.currentPage )
    		return null;
    	for (var i=0; i<this.currentPage.content.length; i++) {
    		var elem = this.currentPage.content[i];
    		var d = 10;
    		var rect = {x:elem.x-d, y:elem.y-d, w:elem.width+d, h:elem.height+d};
    		var center = Geometry.centerOfRectangle(rect);
    		var angle = Geometry.toRadians(elem.rotation);
    		var rotatedPoint = Geometry.rotatedPoint(loc, center, angle);
    		if ( Geometry.isPointInRectangle(loc, rect) )
    			return elem;
    	}
    	return null;
    },

    // User click on control? If so, return action string
    clickOnControl: function(loc, fig) {
    	var corner, rp;
    	var center = Geometry.centerOfRectangle(
    		            {x: fig.x, y: fig.y, w: fig.width, h: fig.height}
    		         );
    	var angle = Geometry.toRadians(fig.rotation);

    	// Check if mouseDown was on delete control (top-left corner)
    	corner = {x: fig.x, y: fig.y};
    	rp = Geometry.rotatedPoint(corner, center, angle);
    	if ( Geometry.isPointInRectangle(loc, {x: rp.x-10, y: rp.y-10, w: 20, h: 20}) )
    		return 'deleting';

    	// Check if mouseDown was on resize control (bottom-right corner)
    	corner = {x: fig.x+fig.width, y: fig.y+fig.height};
    	rp = Geometry.rotatedPoint(corner, center, angle);
    	if ( Geometry.isPointInRectangle(loc, {x: rp.x-10, y: rp.y-10, w: 20, h: 20}) )
    		return 'resizing';

    	// Otherwise, action enabled is moving (dragging)
    	return 'moving';
    },

    //===================================================================================
    // Canvas event handling
    //===================================================================================
	onCanvasMouseDown: function (event) {
		var loc = Book.windowToCanvasCoord(event.clientX, event.clientY);
		var clickedOn = Book.selectedObject(loc);
		if ( ! clickedOn || Book.currentElement != clickedOn ) {
			// User select an object in canvas
    		Book.currentElement = clickedOn;
    		Book.actionOnElement = '';
    		return;
    	}
    	if ( Book.mode == 'editing' ) {
	    	var elem = Book.currentElement;
	    	var action = Book.clickOnControl(loc, elem);
			Book.prevPosX = loc.x;
			Book.prevPosY = loc.y;
			Book.actionOnElement = Book.clickOnControl(loc,elem);
		}
	},

	onCanvasMouseMove: function (event) {
		if ( ! Book.currentPage || ! Book.currentElement || Book.mode != 'editing' )
			return;
		var elem = Book.currentElement;
		var loc = Book.windowToCanvasCoord(event.clientX, event.clientY);
		if ( Book.actionOnElement == 'moving' ) {
			elem.x += loc.x - Book.prevPosX;
			elem.y += loc.y - Book.prevPosY;
			Book.prevPosX = loc.x;
			Book.prevPosY = loc.y;
		} else if ( Book.actionOnElement == 'resizing' ) {
			elem.width = loc.x-elem.x;
			elem.height = loc.y-elem.y;
		}
		if ( Book.actionOnElement != '' )
			Book.drawPage();
	},

	onCanvasMouseUp: function (event) {
		if ( Book.mode == 'editing' ) {
			if ( Book.actionOnElement == 'deleting' ) {
	    		if ( window.confirm('¿Está seguro?') )
	    			Book.deleteElement();
	    	}
	    	Book.actionOnElement = '';
	    	Book.updateProperties();
	    	Book.drawPage();
    	} else
    		// We are in 'playing' mode
    		if ( Book.currentElement ) {
    			if ( Book.currentElement.type == 'sprite' && Book.currentElement.animationStart == 'click' ) {
    				console.log('Activating sprite...');
    				Book.currentElement.stopped = false;
    			} else if ( Book.currentElement.gotoPage > 0 && Book.currentElement.gotoPage <= Book.pages.length ) 
    			{
    				// Page change
    				Book.stopPlay();
    				Book.currentPage = Book.pages[Book.currentElement.gotoPage-1];
    				Book.play();
    			}
    		}
	},	

	onDragOverCanvas: function(event) {
		console.log('On dragOver...');
		event.preventDefault();
		if (event.stopPropagation)
    		event.stopPropagation();
	},

	// Drop an image from gallery
	onCanvasDrop: function(event) {
		event.preventDefault();
		if (event.stopPropagation)
    		event.stopPropagation();

		console.log('On canvas drop...');
		if ( ! Book.currentPage ) {
			console.log('No current page, returning...');
			return;
		}

		// this (or event.target) is the canvas
		if ( Book.draggingFrom == 'backgrounds' ) {
			Book.currentPage.background = Book.draggedImageId/1;
		}
		else {
			// Dragged is an image or sprite
			var loc = Book.windowToCanvasCoord(event.clientX, event.clientY);
			if ( Book.draggingFrom == 'images' )
				Book.addImage(loc);
			if ( Book.draggingFrom == 'sprites' )
				Book.addSprite(loc);
			Book.currentElement = Book.currentPage.content[Book.currentPage.content.length - 1];
			Book.updateProperties();
		}
		
		Book.drawPage();
	},

	// Add the dropped image (dragged from gallery to current page)
	addImage: function (pos) {
		console.log('Adding image ' + this.draggedImageId);
		this.currentPage.content.push(
			{
				type: 'image',
				index: this.draggedImageId/1, 	// index in image gallery
				x: pos.x,						// Initial position
				y: pos.y,
				width: 100,						// and size
				height: 100,
				rotation: 0,					// Rotation degrees
				sound: -1,						// sound index (in Book.sounds[])
                text: '',                       // To show with image
				gotoPage: 0						// Skip to page when click
			}
		);
	},

	// Add an dropped sprite (dragged from gallery to current page)
	addSprite: function (pos) {
		console.log('Adding sprite ' + this.draggedImageId);
		this.currentPage.content.push(
			{
				type: 'sprite',
				index: this.draggedImageId/1,	// index in image gallery
				x: pos.x,						// Initial position
				y: pos.y,
				width: 100,						// and size
				height: 100,
				rotation: 0,					// Rotation degrees
				sound: -1,						// Sound index (in Book.sounds[])
                text: '',                       // Text (to be displayed when animating)
				ticksPerFrame: 5,				// 12 fps when running at 60 fps
				animationStart: 'show',			// click | show
				animationEnd: 'repeat',  		// stop | reset | repeat
				stopped: false,					// Animation state 
				currentFrame: 0,				// Attributes for animation
				ticks: 0
			}
		);
	},	

    // Delete selected element
    deleteElement: function () {
    	if (this.currentPage && this.currentElement) {
    		var i = this.currentPage.content.indexOf(this.currentElement);
    		this.currentPage.content.splice(i,1);
    		this.currentElement = null;
    		this.drawPage();
    	}
    },
	
	//===================================================================================
	// Canvas drawing
	//===================================================================================
    drawPage: function () {
    	if ( ! this.currentPage )
    		return;

    	this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    	this.ctx.beginPath();

		// Draw background
		if ( this.currentPage.background >= 0 ) {
			var img = this.images[this.currentPage.background];
			this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
		}
		
		// Draw images
    	for (var i = 0; i<this.currentPage.content.length; i++) {
    		var elem = this.currentPage.content[i];
    		var x = elem.x,
    	        y = elem.y;
    	
	    	if ( elem.rotation > 0) {
	    		var w = elem.width,
    	    	    h = elem.height;
	    		this.ctx.save();
	    		// 1: Translate canvas context origin to center of figure
    			this.ctx.translate(x + w/2, y + h/2);
    			// 2: rotate context
    			this.ctx.rotate(elem.rotation * Math.PI / 180);
    			x = -(w/2); y = -(h/2);
	    	}
	    	if ( elem.type == 'image' )
	    		this.drawImage(elem, x, y);
	    	else
	    		this.drawSpriteFrame(elem, x, y);
	    	if ( elem.rotation != 0 )
	    		this.ctx.restore(); // return to previous canvas settings
	    }
        /*
        if ( this.mode == 'editing' )
            this.updatePageMiniature();
        */
    },

    // Draw image controls (for move, resize, rotate, delete and open properties dialog)
    drawControls: function(x,y,w,h) {
    	// this.ctx.stokeStyle = 'rgba(0,0,255,1)';
    	this.ctx.lineWidth = 1;
    	this.ctx.strokeRect(x,y,w,h);
    	
    	// draw resize control (in bottom-right corner)
    	this.ctx.lineWidth = 3;
    	this.ctx.moveTo(x+w,y+h);
    	this.ctx.lineTo(x+w-10,y+h);
    	this.ctx.lineTo(x+w,y+h-10);
    	this.ctx.lineTo(x+w,y+h);
    	this.ctx.stroke();

    	// draw delete control (in top-left corner)
    	this.ctx.beginPath();
    	this.ctx.moveTo(x-5,y-5); this.ctx.lineTo(x+5,y+5);
    	this.ctx.moveTo(x-5,y+5); this.ctx.lineTo(x+5,y-5);
		this.ctx.stroke();
	},

    drawText: function (elem) {
        this.ctx.font = '30px Comic Sans MS';
        var txtWidth = this.ctx.measureText(elem.text).width,
            x = elem.x + elem.width/2 - txtWidth/2,
            y = elem.y + elem.height/2;
        this.ctx.fillStyle = 'black';
        this.ctx.fillText(elem.text,x,y);
    },

	// Draw a sprite frame and compute next frame
	drawSpriteFrame: function (elem, x, y) {
		var i = elem.index - (this.backgroundsGallery.length + this.imagesGallery.length);
		var sprite = this.spritesGallery[i];
		var img = this.images[elem.index];
		var col = Math.floor(elem.currentFrame % sprite.cols);
		var row = Math.floor(elem.currentFrame / sprite.cols);
		var sw  = Math.floor(img.width / sprite.cols);	// source frame width
		var sh  = Math.floor(img.height / sprite.rows);	// source frame height
    	var sx  = col * sw;								// source frame x position	
    	var sy  = row * sh;								// source frame y position

    	console.log('Drawing sprite ' + elem.index, ' frame:' + elem.currentFrame );
    	console.log('Frame: (' + sx + ',' + sy + ',' + sw + ',' + sh + ')');
		Book.ctx.drawImage(img, sx, sy, sw, sh, x, y, elem.width, elem.height);
		if ( Book.mode == 'editing' &&  elem == Book.currentElement )
			Book.drawControls(x, y, elem.width, elem.height);
    	
        // compute next frame
    	if ( this.mode == 'playing' && !elem.stopped ) {
    		if ( elem.text.length > 0 )
            	this.drawText(elem);
            if ( ++(elem.ticks) == 60/elem.ticksPerFrame ) {
    			var frames = sprite.cols * sprite.rows;
    			elem.ticks = 0;
    			if ( elem.animationEnd == 'repeat' )
    				elem.currentFrame = (elem.currentFrame + 1) % frames;
    			else
    				if ( elem.currentFrame < frames - 1 )
    					elem.currentFrame++;
    				else
    					// Stop sprite animation
    					if ( elem.currentFrame == frames - 1 ) {
	    					if ( elem.animationEnd == 'reset' )
	    						elem.currentFrame = 0;
	    					elem.stopped = true;
    					}
    		}
        }
	},

	// Draw image in canvas
	drawImage: function(elem, x, y) {
		var image = this.images[elem.index];
	    this.ctx.drawImage(image, x, y, elem.width, elem.height);
        if ( elem.text.length > 0 )
            this.drawText(elem);
	   	if (this.mode == 'editing' && elem == this.currentElement)
    		this.drawControls(x,y,elem.width,elem.height);
	},

	//===================================================================================
	// Gallery images start dragging events
	//===================================================================================
    onBackgroundsDragStart: function (event) {
    	if ( Book.mode == 'editing' && Book.currentPage ) {
    		console.log('Drag started from backgrounds...');
    		Book.draggedImageId = this.id;
    		Book.draggingFrom = 'backgrounds';
    	} else
    		alert('Crea una página antes...');
    },

    onImagesDragStart: function (event) {
    	if ( Book.mode == 'editing' && Book.currentPage ) {
    		console.log('Drag started from images...');
	    	Book.draggedImageId = this.id;
	    	Book.draggingFrom = 'images';
	    } else
    		alert('Crea una página antes...');
    },

    onSpritesDragStart: function (event) {
    	if ( Book.mode == 'editing' && Book.currentPage ) {
    		console.log('Drag started from sprites...');
	    	Book.draggedImageId = this.id;
	    	Book.draggingFrom = 'sprites';
	    } else
    		alert('Crea una página antes...');
    },

    //===================================================================================
    // Pages management
    //===================================================================================
    // Add page after current page
    addPage: function () {
    	var i = (!this.currentPage)? -1 : this.pages.indexOf(this.currentPage);    
        // insert new page
    	this.pages.splice(++i,0,{ background: -1, content: [] }); 
    	this.currentPage = this.pages[i];
    	this.createPagesGallery();
    	this.drawPage();
    },

    // Delete current page
    deletePage: function () {
    	if ( ! this.currentPage )
    		return;
    	var i = this.pages.indexOf(this.currentPage);
		this.pagesContainer.removeChild(this.getCurrentPageMiniature());
		this.pages.splice(i,1);

		// Select new current page
		if ( this.pages.length == 0 )
			this.currentPage = this.currentElement = null;
		else if (i >= this.pages.length)
			this.currentPage = this.pages[this.pages.length - 1];
		if ( this.currentPage ) {
            this.createPagesGallery();
			this.drawPage();
		}
    },

    //===================================================================================
    // Handling changes on input in properties dialog
    //===================================================================================
    onChangeSound: function (src) {
    	// To do...
    },

	onChangeGotoPage: function (value) {
		if ( this.currentElement && this.currentElement.type == 'image' ) {
			console.log('changing goto (' + value + ') to ' + this.currentElement.index);
	    	this.currentElement.gotoPage = value;
		}
    },    

    onChangeAnimStart: function (value) {
    	if ( this.currentElement && this.currentElement.type == 'sprite' ) {
	    	this.currentElement.animationStart = value;
	    	this.currentElement.currentFrame = this.currentElement.ticks = 0;
	    	this.currentElement.stopped = (value == 'click');
    	}
    },

    onChangeAnimEnd: function (value) {
    	if ( this.currentElement && this.currentElement.type == 'sprite' ) {
	    	this.currentElement.animationEnd = value;
	    	this.currentElement.currentFrame = this.currentElement.ticks = 0;
    	}
    },

    onChangeAnimSpeed: function (value) {
    	if ( this.currentElement && this.currentElement.type == 'sprite' ) {
    		console.log('New speed: ' + value);
	    	this.currentElement.ticksPerFrame = value;	// asumming running at 60 fps
	    	this.currentElement.currentFrame = this.currentElement.ticks = 0;
    	}
    },

    onChangeText: function (value) {
        if ( this.currentElement ) {
            console.log('New text: ' + value);
            this.currentElement.text = value;
            this.drawPage();
        }
    },

    updateProperties: function () {
    	var gotoPage = document.getElementById('goto-page');
    	var animStart = document.getElementById('anim-start');
    	var animEnd = document.getElementById('anim-end');
    	var animSpeed = document.getElementById('anim-speed');
    	var sound = document.getElementById('sound-src');
        var text = document.getElementById('text');

		gotoPage.value = animSpeed.value = 0;
		gotoPage.disabled = animStart.disabled = animEnd.disabled = animSpeed.disabled = sound.disabled =
		animSpeed.disabled = text.disabled = true;

		if ( this.currentElement ) {
            text.disabled = false;
            text.value = Book.currentElement.text;
			sound.disabled = false;
			sound.filename = Book.currentElement.sound;
		}
		else
			return;
    	if ( this.currentElement.type == 'image' ) {
    		gotoPage.disabled = false;
    		gotoPage.value = Book.currentElement.gotoPage;
    		animSpeed.value = 0;
    		/*
    		if ( this.currentElement.src.search('speech_bubble') >= 0)
    			text.disabled = false;
    		*/
    	}
    	if ( this.currentElement.type == 'sprite' ) {
    		animStart.disabled = false;
	    	animStart.value = Book.currentElement.animationStart;

	    	animEnd.disabled = false;
	    	animEnd.value = Book.currentElement.animationEnd;

	    	animSpeed.disabled = false;
	    	animSpeed.value = Book.currentElement.ticksPerFrame;

    		gotoPage.value = 0;
    		gotoPage.disabled = true;
    	}
    },

    //===================================================================================
    // Proyect save/load
    //===================================================================================
    onOpen: function () {
        // TO DO: Get list of book names to able user select
        var libro = window.prompt('Nombre del libro: ','libro1');
        if ( libro ) {
            var request = new XMLHttpRequest();
            request.open('GET', libro + '.json', true);
            request.onreadystatechange = function () {
                if ( request.readyState == 4 && request.status == 200 ) {
                    Book.pages = eval(request.responseText);
                    if ( Book.pages.length > 0 ) {
                        Book.currentPage = Book.pages[0];
                        Book.createPagesGallery();
                    }
                }
            };
            request.send();
        }
    },

    // Save book in files. To do: Use a server for uploading content
    onSave: function () {
        document.getElementById('file_name').value = Book.libro;
    	document.getElementById('save-dialog').style.display = 'block';
    },

    save: function () {
        var file = document.getElementById('file_name');
    	var saveJSON = document.getElementById('save-json').checked;
    	var json = JSON.stringify(this.pages);
    	this.closeDialog('save-dialog');
        var request = new XMLHttpRequest();
        
        Book.libro = file.value;
        var ext = saveJSON? '.json' : '.html';
        request.open('PUT', Book.libro + ext, true);
        request.onreadystatechange = function () {
            if ( request.readyState == 4 )
                if ( request.status == 200 )
                    window.alert('Libro guardado.');
                else
                    window.alert('Un error ocurrió al guardar!!!');
        };
    	if ( saveJSON )	
            request.send(json);
	    else {
	    	// Export full HTML document
	    	var scriptElement = document.getElementById('start');
	    	scriptElement.text = 'Book.pages = ' + json + '; Book.startInPlayingMode();';
	    	request.send('<!DOCTYE html>' + document.outerHTML);
	    }
    },

    closeDialog: function (dlgId) {
    	document.getElementById(dlgId).style.display = 'none';
    },

    //===================================================================================
    // Animation
    //===================================================================================
    animFrameID: null,

    update: function (time) {
    	Book.drawPage();
    	Book.animFrameID = window.requestAnimationFrame(Book.update);
    },

    stopPlay: function () {
    	// from playing to edition mode
    	window.cancelAnimationFrame(this.animFrameID);

    	// Change icon fro stop to play
    	this.playBtn.style.backgroundImage = this.playBtnBackground;
    	this.animFrameID = null;
    	this.mode = 'editing';

    	this.createPagesGallery();
    },

    // Start playing from current page
    play: function () {
    	if ( this.mode == 'editing' && this.pages.length > 0 ) {
    		// from editing to playing
    		var page = Book.currentPage;
    		this.mode = 'playing';
    		// this.playBtn.style.backgroundImage = this.stopBtn.style.backgroundImage;
    		this.playBtn.style.backgroundImage = 'url("res/stop-icon.png")';

    		// reset sprites
    		for (var i=0; i < page.content.length; i++)
    			if ( page.content[i].type == 'sprite' ) {
    				page.content[i].stopped = page.content[i].animationStart == 'click';
    				page.content[i].currentFrame = 0;
    			}
    		this.animFrameID = window.requestAnimationFrame(this.update);
    	}
    	else
    		if ( this.mode == 'playing' )
    		this.stopPlay();
    }
};

/* vim: set expandtab tabstop=4 shiftwidth=4 : */
