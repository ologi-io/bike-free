var SpriteArray = require('./spriteArray');
var EventedLoop = require('eventedloop');

(function (global) {
	function Game (mainCanvas, player) {
		var staticObjects = new SpriteArray();
		var movingObjects = new SpriteArray();
		var uiElements = new SpriteArray();
		var dContext = mainCanvas.getContext('2d');
		var mouseX = dContext.getCentreOfViewport();
		var mouseY = 0;
		var paused = false;
		var that = this;
		var beforeCycleCallbacks = [];
		var afterCycleCallbacks = [];
		var gameLoop = new EventedLoop();
		var backgroundImageKey = null;
		var startHeaderImageKey = null;
		var staticCullPadding = 300;

		this.addStaticObject = function (sprite) {
			staticObjects.push(sprite);
		};

		this.addStaticObjects = function (sprites) {
			sprites.forEach(this.addStaticObject.bind(this));
		};

		this.addMovingObject = function (movingObject, movingObjectType) {
			if (movingObjectType) {
				staticObjects.onPush(function (obj) {
					if (obj.data && obj.data.hitBehaviour[movingObjectType]) {
						obj.onHitting(movingObject, obj.data.hitBehaviour[movingObjectType]);
					}
				}, true);
			}

			movingObjects.push(movingObject);
		};

		this.addUIElement = function (element) {
			uiElements.push(element);
		};

		this.setBackgroundImage = function (imageKey) {
			backgroundImageKey = imageKey;
		};

		this.setStartHeaderImage = function (imageKey) {
			startHeaderImageKey = imageKey;
		};

		this.beforeCycle = function (callback) {
			beforeCycleCallbacks.push(callback);
		};

		this.afterCycle = function (callback) {
			afterCycleCallbacks.push(callback);
		};

		this.setMouseX = function (x) {
			mouseX = x;
		};

		this.setMouseY = function (y) {
			mouseY = y;
		};

		player.setMapPosition(0, 0);
		player.setMapPositionTarget(0, -10);
		dContext.followSprite(player);

		var intervalNum = 0;

		function getPlayerForwardVector () {
			var dx = 0;
			var dy = 1;

			if (typeof player.direction !== 'undefined') {
				var radians = (player.direction - 90) * (Math.PI / 180);
				dx = Math.cos(radians);
				dy = Math.sin(radians);
			} else if (player.movingToward) {
				dx = player.movingToward[0] - player.mapPosition[0];
				dy = player.movingToward[1] - player.mapPosition[1];
			}

			var length = Math.sqrt((dx * dx) + (dy * dy)) || 1;
			return [ dx / length, dy / length ];
		}

		function cullStaticObjectsBehindPlayer () {
			var forward = getPlayerForwardVector();
			var cullDistance = Math.max(mainCanvas.width, mainCanvas.height) + staticCullPadding;

			staticObjects.each(function (staticObject) {
				if (!staticObject || !staticObject.mapPosition) return;

				var dx = staticObject.mapPosition[0] - player.mapPosition[0];
				var dy = staticObject.mapPosition[1] - player.mapPosition[1];
				var behindDistance = -((dx * forward[0]) + (dy * forward[1]));

				if (behindDistance > cullDistance) {
					if (staticObject.deleteOnNextCycle) {
						staticObject.deleteOnNextCycle();
					} else {
						staticObject.deleted = true;
					}
				}
			});
		}

		this.cycle = function () {
			beforeCycleCallbacks.each(function(c) {
				c();
			});

			// Clear canvas
			var mouseMapPosition = dContext.canvasPositionToMapPosition([mouseX, mouseY]);

			if (!player.isJumping) {
				player.setMapPositionTarget(mouseMapPosition[0], mouseMapPosition[1]);
			}

			intervalNum++;

			player.cycle();

			movingObjects.each(function (movingObject, i) {
				movingObject.cycle(dContext);
			});
			
			cullStaticObjectsBehindPlayer();
			staticObjects.cull();
			staticObjects.each(function (staticObject, i) {
				if (staticObject.cycle) {
					staticObject.cycle();
				}
			});

			uiElements.each(function (uiElement, i) {
				if (uiElement.cycle) {
					uiElement.cycle();
				}
			});

			afterCycleCallbacks.each(function(c) {
				c();
			});
		};

		function drawBackground () {
			var image = backgroundImageKey && dContext.getLoadedImage(backgroundImageKey);
			if (!image) return;

			var origin = dContext.mapPositionToCanvasPosition([0, 0]);
			var tileWidth = image.naturalWidth || image.width;
			var tileHeight = image.naturalHeight || image.height;
			var startX = origin[0] % tileWidth;
			var startY = origin[1] % tileHeight;
			if (startX > 0) startX -= tileWidth;
			if (startY > 0) startY -= tileHeight;

			for (var x = startX; x < mainCanvas.width; x += tileWidth) {
				for (var y = startY; y < mainCanvas.height; y += tileHeight) {
					dContext.drawImage(image, Math.round(x), Math.round(y));
				}
			}
		}

		function drawStartHeader () {
			var image = startHeaderImageKey && dContext.getLoadedImage(startHeaderImageKey);
			if (!image) return;

			var width = image.naturalWidth || image.width;
			var topLeft = dContext.mapPositionToCanvasPosition([
				0 - (width / 2),
				0 - (mainCanvas.height / 2)
			]);
			var startX = topLeft[0] % width;
			if (startX > 0) startX -= width;

			for (var x = startX; x < mainCanvas.width; x += width) {
				dContext.drawImage(image, Math.round(x), Math.round(topLeft[1]));
			}
		}

		that.draw = function () {
			// Clear canvas
			mainCanvas.width = mainCanvas.width;
			dContext.imageSmoothingEnabled = false;
			drawBackground();
			drawStartHeader();
			
			// so the rider is always in front of the bushes.
			staticObjects.each(function (staticObject, i) {
				if (staticObject.data.under === true && staticObject.draw) {
					staticObject.draw(dContext, 'main');
				}
			});
			
			player.draw(dContext);

			player.cycle();

			movingObjects.each(function (movingObject, i) {
				movingObject.draw(dContext);
			});
			
			staticObjects.each(function (staticObject, i) {
				
				if (!staticObject.data.under && staticObject.draw) {
					staticObject.draw(dContext, 'main');
				}
			});

			uiElements.each(function (uiElement, i) {
				if (uiElement.draw) {
					uiElement.draw(dContext, 'main');
				}
			});
		};

		this.start = function () {
			gameLoop.start();
		};

		this.pause = function () {
			paused = true;
			gameLoop.stop();
		};

		this.resume = function () {
			if (!paused) return;
			paused = false;
			gameLoop.start();
		};

		this.isPaused = function () {
			return paused;
		};

		this.reset = function () {
			paused = false;
			staticObjects = new SpriteArray();
			movingObjects = new SpriteArray();
			mouseX = dContext.getCentreOfViewport();
			mouseY = 0;
			player.reset();
			player.setMapPosition(0, 0, 0);
			this.start();
		}.bind(this);

		gameLoop.on('20', this.cycle);
		gameLoop.on('20', this.draw);
	}

	global.game = Game;
})( this );


if (typeof module !== 'undefined') {
	module.exports = this.game;
}
