// gallery.js

function loadBackgrounds() {
	Book.backgroundsGallery.push('backgrounds/book-background.jpg');
}

function loadImages() {
	Book.imagesGallery.push('images/lucas.gif');
	Book.imagesGallery.push('images/mickey.jpg');
}

function loadSprites() {
	Book.spritesGallery.push({ src: 'sprites/bee-float.png', cols:4, rows: 1 });
	Book.spritesGallery.push({ src: 'sprites/character-jump.png', cols:2, rows: 1 });
	Book.spritesGallery.push({ src: 'sprites/walksequence_spritesheet.png', cols:6, rows: 5 });
}

