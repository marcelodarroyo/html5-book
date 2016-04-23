/*=======================================================================================
Book namespace
Description: The Book object controls the rendering of the Book pages. It is a pages
container. Each page contains a set of objects which can be figures and a sound. A figure
can have a movement or can represent a jump to other page.
*/

Book = {
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
	draggingObject: null,		// image (of gallery) dragged 
	draggingFrom: null,			// 'from-backgrounds', 'from-images', 'from-sprites'

	// image is been resizing/rotated
	actionOnElement: '',		// 'moving', 'resizing', 'rotating'

	// For tracking the movement of objects (when this.actionOnElement == 'moving')
	prevPosX: 0,
	prevPosY: 0,

	// Sounds container
	sounds: null,

	// Book initialization
	init: function (canvas) {
		this.canvas = document.getElementById(canvas);
		if (this.canvas.getContext)
          this.ctx = this.canvas.getContext('2d');

        this.resize();
        this.loadGallery();
        this.initGallery();

        this.openPropertiesDialog = document.getElementById('open-properties-dialog');
        this.sounds = document.getElementById('sounds');

        this.pagesContainer = document.getElementById('pages');
        
        this.canvas.addEventListener('mousedown', this.onCanvasMouseDown, false);
	    this.canvas.addEventListener('mouseup', this.onCanvasMouseUp, false);
	    this.canvas.addEventListener('mousemove', this.onCanvasMouseMove, false);
	    Book.canvas.addEventListener('dragover', Book.onDragOverCanvas);
        Book.canvas.addEventListener('drop', Book.onCanvasDrop);
	},

	// call the external (user-defined) functions
	loadGallery: function () {
		loadBackgrounds();
		loadImages();
		loadSprites();
	},

	// Resize elements relative to window size
	resize: function () {
		this.canvas.width =  80 * window.innerWidth / 100;  // 80% of window width
		this.canvas.height = 90 * window.innerHeight / 100; // 90% of window height
		
		if ( this.mode == 'editing' ) {
			// Resize galleries
			var gallery = document.getElementById('gallery');
			gallery.style.height = this.canvas.height + 'px';

			var pagesGallery = document.getElementById('pages-gallery');
			pagesGallery.style.height = this.canvas.height + 'px';
		}

		if ( this.ctx )
			this.drawPage();
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

	addImageToGallery: function (gallery, src) {
		var container = document.getElementById(gallery);
		var img = new Image();
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
	},

	findSpriteOnGallery: function (imgSrc) {
		for (var i = 0; i < this.spritesGallery.length; i++)
			if ( imgSrc.endsWith(this.spritesGallery[i].src) )
				return this.spritesGallery[i];
		console.log("Panic: can't find sprite " + imgSrc + " on gallery");
		return null;
	},

	// Create a miniature for pages gallery
	createMiniature: function () {
		var i = this.pages.indexOf(this.currentPage);
		console.log('Creating miniature for page ' + i);
		var img = new Image();
		img.id = 'page-'+i;
		img.crossOrigin = 'Anonymous';
		img.src = this.canvas.toDataURL();
		this.currentPage.miniature = img;
		this.currentPage.miniature.className = 'current-page';
		img.addEventListener('click', this.onPageSelect, false);
		var old = document.getElementById(img.id);
		if ( old )
			this.pagesContainer.replaceChild(img,old);
		else
			this.pagesContainer.appendChild(img);
	},

	// create pages miniatures on pages gallery
	createPagesGallery: function () {
		while ( this.pagesContainer.firstChild )
			this.pagesContainer.removeChild(this.pagesContainer.firstChild);
		for (var i=0; i < this.pages.length; i++) {
			this.currentPage = this.pages[i];
			this.drawPage();
			this.currentPage.miniature.className = '';
		}
		if ( this.pages.length ) {
			this.currentPage = this.pages[0];
			this.drawPage();
		}
	},

	// Convert window coordindates to canvas coordinates
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

		// Check if mouseDown was on rotate control (top-right corner)
    	corner = {x: fig.x+fig.width, y: fig.y};
    	rp = Geometry.rotatedPoint(corner, center, angle);
    	if ( Geometry.isPointInRectangle(loc, {x: rp.x-10, y: rp.y-10, w: 20, h: 20}) )
    		return 'rotating';

    	// Check if mouseDown was on properties control (bottom-left corner)
    	corner = {x: fig.x, y: fig.y + fig.height};
    	rp = Geometry.rotatedPoint(corner, center, angle);
    	if ( Geometry.isPointInRectangle(loc, {x: rp.x-10, y: rp.y-10, w: 20, h: 20}) )
    		return 'open-properties-dialog';

    	// Otherwise, action enabled is moving (dragging)
    	return 'moving';
    },

    //=========================== Canvas event handlers ===========================
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
		} else if ( Book.actionOnElement == 'rotating' )
			if (loc.x > elem.x + elem.width && loc.y > elem.y)
				elem.rotation += 1; // Rotate in 5 degrees steps (clockwise)
			else
				elem.rotation -= 1;
		if ( Book.actionOnElement != '' )
			Book.drawPage();
	},

	onCanvasMouseUp: function (event) {
		if ( Book.mode == 'editing' ) {
			if ( Book.actionOnElement == 'deleting' ) {
	    		if ( window.confirm('¿Está seguro?') )
	    			Book.deleteElement();
	    	}
	    	else if ( Book.actionOnElement == 'open-properties-dialog' ) {
	    		document.getElementById('goto-page').value = Book.currentElement.gotoPage;
	    		if ( Book.currentElement.type == 'sprite' ) {
		    		document.getElementById('anim-start').value = Book.currentElement.animationStart;
		    		document.getElementById('anim-end').value = Book.currentElement.animationEnd;
		    		document.getElementById('anim-speed').value = Book.currentElement.ticksPerFrame;
	    		} else {
	    			document.getElementById('goto-page').value = Book.currentElement.gotoPage;
	    			console.log('currentElement.gotoPage:' + Book.currentElement.gotoPage);
	    		}
	    		Book.openPropertiesDialog.click();
	    	}
	    	Book.actionOnElement = '';
	    	Book.drawPage();
    	} else
    		// We are in 'playing' mode
    		if ( Book.currentElement ) {
    			console.log('Goto page' + (Book.currentElement.gotoPage-1)) ;
    			if ( Book.currentElement.type == 'sprite' && Book.currentElement.animationStart == 'click' ) {
    				console.log('Activating srite...');
    				Book.currentElement.stopped = false;
    			}
    			if ( Book.currentElement.type == 'image' && !Book.currentElement.gotoPage &&
    				 Book.currentElement.gotoPage > 0 && Book.currentElement.gotoPage <= Book.pages.length ) 
    			{
    				Book.stopPlay();
    				Book.currentPage = Book.pages[Book.currentElement.gotoPage-1];
    				Book.play();
    			}
    		}
	},	

	onDragOverCanvas: function(event) {
		console.log('On dragOver...');
		event.preventDefault();
		if (event.stopPropagation) {
    		event.stopPropagation(); // stops the browser from redirecting.
		}
	},

	// Drop an image from gallery
	onCanvasDrop: function(event) {
		console.log('On canvas drop...');
		if ( ! Book.currentPage ) {
			console.log('No current page, returning...');
			return;
		}
		event.preventDefault();
		if (event.stopPropagation) {
    		event.stopPropagation(); // stops the browser from redirecting.
		}

		// this or event.target is the canvas
		var imgSrc;
		if ( Book.draggingFrom == 'backgrounds-gallery' )
			imgSrc = Book.currentPage.background = Book.draggingObject.src;
		else {
			var loc = Book.windowToCanvasCoord(event.clientX, event.clientY);
			if ( Book.draggingFrom == 'images-gallery' )
				Book.addImage(loc);
			if ( Book.draggingFrom == 'sprites-gallery' )
				Book.addSprite(loc);
			Book.currentElement = Book.currentPage.content[Book.currentPage.content.length - 1];
			imgSrc = Book.currentElement.src;
		}
		
		Book.drawPage();
	},
	
	//=========================== Draw current page =========================
    drawPage: function () {
    	if ( this.currentPage ) {
    		console.log('Drawing page...');
	    	this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
	    	this.ctx.beginPath();
	    	this.drawPageBackground();
	    	this.drawPageContent();
	    	if ( this.mode == 'editing' )
	        	this.createMiniature();
	    }
    },

    drawPageBackground: function () {
    	if ( this.currentPage.background ) {
	    	var image = new Image();
	    	image.src = this.currentPage.background;
	    	this.ctx.drawImage(image, 0, 0, this.canvas.width, this.canvas.height);
	    }
    },

    // Draw image controls (for move, resize, and rotate)
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

    	// draw rotation control (in top-right corner)
    	this.ctx.beginPath();
    	this.ctx.arc(x+w,y,5,0,2*Math.PI,true);
    	this.ctx.stroke();

    	// draw delete control (in top-left corner)
    	this.ctx.beginPath();
    	this.ctx.moveTo(x-5,y-5); this.ctx.lineTo(x+5,y+5);
    	this.ctx.moveTo(x-5,y+5); this.ctx.lineTo(x+5,y-5);
		this.ctx.stroke();

		// draw properties edit control (in bottom-left corner)
    	this.ctx.strokeRect(x-5,y+h-5,10,10);
	},

	drawSpriteFrame: function (elem, image, x, y) {
		var col = Math.floor(elem.currentFrame % elem.cols);
		var row = Math.floor(elem.currentFrame / elem.cols);
		var sw = image.width  / elem.cols;			// source frame width
		var sh = image.height / elem.rows;			// source frame height
    	var sx = col * sw;							// source frame x position	
    	var sy = row * sh;							// source frame y position

		this.ctx.drawImage(image, sx, sy, sw, sh, x, y, elem.width, elem.height);
		if ( this.mode == 'editing' &&  elem == this.currentElement )
			this.drawControls(x, y, elem.width, elem.height);
    	
    	if ( this.mode == 'playing' && !elem.stopped )
    		// get next frame
    		if ( ++(elem.ticks) == 60/elem.ticksPerFrame ) {
    			var frames = elem.cols * elem.rows;
    			elem.ticks = 0;
    			if ( elem.animationEnd == 'repeat' )
    				elem.currentFrame = (elem.currentFrame + 1) % frames;
    			else
    				if ( elem.currentFrame < frames - 1 )
    					elem.currentFrame++;
    				else
    					// We have to stop sprite
    					if ( elem.currentFrame == frames - 1 ) {
	    					if ( elem.animationEnd == 'reset' )
	    						elem.currentFrame = 0;
	    					elem.stopped = true;
    					}
    		}
	},

	// Draw image in canvas
	drawImage: function(elem, image, x, y) {
	    this.ctx.drawImage(image, x, y, elem.width, elem.height);
	   	if (this.mode == 'editing' && elem == this.currentElement)
    		this.drawControls(x,y,elem.width,elem.height);
	},

    drawPageContent: function () {
    	var page = this.currentPage;
    	for (var i=0; i<page.content.length; i++) {
    		var elem = page.content[i];
	    	var x = elem.x,
	    	    y = elem.y,
	    	    width = elem.width,
	    	    height = elem.height;
	    	var rotation = elem.rotation;

	    	var image = new Image();
	    	image.src = elem.src;

	    	if ( rotation != 0) {
	    		this.ctx.save(); // save current canvas settings
	    		// 1: Translate canvas origin to center of figure
    			this.ctx.translate(x + width/2, y + height/2);
    			// 2: rotate
    			this.ctx.rotate(rotation * Math.PI / 180);
    			x = -(width/2); y = -(height/2);
	    	}

	    	if ( elem.type == 'image' )
	    		Book.drawImage(elem, image, x, y);
	    	else
	    		Book.drawSpriteFrame(elem, image, x, y);

	    	if ( rotation != 0 )
	    		this.ctx.restore(); // return to previous canvas settings
    	} // end for
    },

    // Add an image dragged from gallery to current page
	addImage: function (pos) {
		var img = {
			type: 'image',
			src: this.draggingObject.src,
			x: pos.x,
			y: pos.y,
			width: 100,
			height: 100,
			rotation: 0,
			sound: null,	// activated on click
			gotoPage: -1
		};
		this.currentPage.content.push(img);
	},

	// Add an sprite from gallery to current page
	addSprite: function (pos) {
		var gallerySprite = this.findSpriteOnGallery(this.draggingObject.src);
		var img = {
			type: 'sprite',
			src: this.draggingObject.src,
			x: pos.x,
			y: pos.y,
			width: 100,
			height: 100,
			rotation: 0,
			sound: null,					// played while animating
			gotoPage: -1,
			cols: gallerySprite.cols,
			rows: gallerySprite.rows,
			currentFrame: 0,
			ticks: 0,
			ticksPerFrame: 5,				// 12 fps when running at 60 fps
			animationStart: 'show',			// click | show
			animationEnd: 'repeat',  		// stop | reset | repeat
			stopped: false
		};
		this.currentPage.content.push(img);
	},	

    // Delete selected element
    deleteElement: function () {
    	if (this.currentPage && this.currentElement) {
    		var i = this.currentPage.content.indexOf(this.currentElement);
    		this.currentPage.content.splice(i,1);
    		this.currentElement = null;
    	}
    	this.drawPage();
    },

	//====================== Dragging events started on gallery =====================
    onBackgroundsDragStart: function (event) {
    	if ( Book.mode == 'editing' && Book.currentPage ) {
    		console.log('Drag started from backgrounds...');
    		Book.draggingObject = this; // this is the background image element
    		Book.draggingFrom = 'backgrounds-gallery';
    	}
    },

    onImagesDragStart: function (event) {
    	if ( Book.mode == 'editing' && Book.currentPage ) {
    		console.log('Drag started from images...');
	    	Book.draggingObject = this;
	    	Book.draggingFrom = 'images-gallery';
	    }
    },

    onSpritesDragStart: function (event) {
    	if ( Book.mode == 'editing' && Book.currentPage ) {
    		console.log('Drag started from sprites...');
	    	Book.draggingObject = this;
	    	Book.draggingFrom = 'sprites-gallery';
	    }
    },

    //=================================== Pages management ===========================
    // Add page after current page
    addPage: function () {
    	var i = (!this.currentPage)? -1 : this.pages.indexOf(this.currentPage);
    	console.log('Adding page ' + (i + 1));
    	if ( this.currentPage )
    		this.currentPage.miniature.className = '';
    	this.pages[++i] = { 
    		background: null, 
    		sound: null, 
    		miniature: null,
    		content: []
    	};
    	this.currentPage = this.pages[i];
    	this.drawPage();
    	this.currentPage.miniature.className = 'current-page';
    },

    // Delete current page
    deletePage: function () {
    	if ( this.currentPage ) {
    		var i = this.pages.indexOf(this.currentPage);
    		var img = document.getElementById('page-'+i);
    		this.pagesContainer.removeChild(img);
    		this.pages.splice(i,1);
    		if ( this.pages.length == 0 )
    			this.currentPage = this.currentElement = null;
    		else if (i >= this.pages.length)
    			this.currentPage = this.pages[this.pages.length - 1];
    	}
    	if ( this.currentPage )
    		Book.currentPage.miniature.click();
    },

    onPageSelect: function (event) {
    	if ( Book.mode == 'editing' ) {
	    	console.log('Selecting page ' + this.id);
	    	console.log('Old current page: ' + Book.pages.indexOf(Book.currentPage));
	    	Book.currentPage.miniature.className = '';
	    	Book.currentPage = Book.pages[this.id.substring(5)/1];
	    	Book.drawPage();
	    	Book.currentPage.miniature.className = 'current-page';
    	}
    },

    //======================= Event handlers properties dialog inputs ===================
    onChangeSound: function (src) {
    	this.currentElement.sound = src;
    	if ( page.content[i].sound ) {
    						var s = new Audio();
    						s.src = page.content[i].sound;
    						this.page.sounds.push(s);
    					}
    },

	onChangeGotoPage: function (value) {
    	this.currentElement.gotoPage = value;
    	this.currentElement.currentFrame = 0;
    },    

    onChangeAnimStart: function (value) {
    	if ( this.currentElement.type == 'sprite' ) {
	    	this.currentElement.animationStart = value;
	    	this.currentElement.currentFrame = this.currentElement.ticks = 0;
	    	this.currentElement.stopped = (value == 'click');
    	}
    },

    onChangeAnimEnd: function (value) {
    	if ( this.currentElement.type == 'sprite' ) {
	    	this.currentElement.animationEnd = value;
	    	this.currentElement.currentFrame = this.currentElement.ticks = 0;
    	}
    },

    onChangeAnimSpeed: function (value) {
    	if ( this.currentElement.type == 'sprite' ) {
	    	this.currentElement.ticksPerFrame = value;	// asumming running at 60 fps
	    	this.currentElement.currentFrame = this.currentElement.ticks = 0;
    	}
    },

    animFrameID: null,

    //=============================== Saving/loading proyect ============================
    open: function () {
    	var fileInput = document.getElementById('open-input');
    	fileInput.click();
    },

    onFileOpen: function(file) {
    	var reader = new FileReader();
    	
    	console.log('Loading pages from' + file.name + ' type: ' + file.type);
    	reader.onload = function (event) {
    		Book.pages = eval(reader.result);
    		console.log('Loaded ' + Book.pages.length + ' pages');
	    	if ( Book.pages.length > 0 )
		    	Book.createPagesGallery();
		    // wait for drawing page miniature
		    window.setTimeout(function () { document.getElementById('page-0').click(); }, 500);
    	};

    	reader.readAsText(file);
    },

    save: function () {
    	var w = window.open();
    	w.document.write( JSON.stringify(this.pages) );
    },

    //====================================== Play Book ==================================
    update: function (time) {
    	Book.animFrameID = window.requestAnimationFrame(Book.update);
    	Book.drawPage();
    },

    stopPlay: function () {
    	// from playing to editing
    	window.cancelAnimationFrame(this.animFrameID);
    	var icon = document.getElementById('play-btn');
    	icon.style.backgroundImage = "url('res/play-icon.png')";
    	this.animFrameID = null;
    	this.mode = 'editing';
    },

    // Start playing current page
    play: function () {
    	if ( this.mode == 'editing' ) {
    		// from editing to playing
    		var icon = document.getElementById('play-btn');
    		var page = this.currentPage;
    		this.mode = 'playing';
    		icon.style.backgroundImage = "url('res/stop-icon.png')";
    		for (var i=0; i < page.content.length; i++)
    			if ( page.content[i].type == 'sprite' ) {
    				page.content[i].stopped = page.content[i].animationStart == 'click';
    				page.content[i].currentFrame = 0;
    			}
    		this.animFrameID = window.requestAnimationFrame(this.update);
    	}
    	else
    		this.stopPlay();
    }
};