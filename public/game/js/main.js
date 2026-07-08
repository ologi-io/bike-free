// Bike Free game source. Adapted from SkiFree.js:
// https://github.com/basicallydan/skifree.js

// Global dependencies which return no modules
require('./lib/canvasRenderingContext2DExtensions');
require('./lib/extenders');
require('./lib/plugins');

// External dependencies
var Hammer = require('hammerjs');
var Mousetrap = require('br-mousetrap');

// Method modules
var isMobileDevice = require('./lib/isMobileDevice');

// Game Objects
var SpriteArray = require('./lib/spriteArray');
var Monster = require('./lib/monster');
var Sprite = require('./lib/sprite');
var Snowboarder = require('./lib/snowboarder');
var Skier = require('./lib/skier');
var InfoBox = require('./lib/infoBox');
var Game = require('./lib/game');

// Local variables for starting the game
var mainCanvas = document.getElementById('skifree-canvas');
var dContext = mainCanvas.getContext('2d');
var backgroundImageSource = '/game/bg.png';
var startHeaderImageSource = '/game/header.png';
var imageSources = [ '/game/sprite-characters.png', '/game/skifree-objects.png', backgroundImageSource, startHeaderImageSource ];
var global = this;
var infoBoxControls = 'Use the mouse or WASDFT to control the rider.';
if (isMobileDevice()) infoBoxControls = 'Tap / double tap on the screen to control the rider.';
var sprites = require('./spriteInfo');

var pixelsPerMetre = 18;
var distanceTravelledInMetres = 0;
var monsterDistanceThreshold = 2000;
var livesLeft = 3;
var highScore = 0;
var monsterActive = false;
var loseLifeOnObstacleHit = false;
var dropRates = {smallTree: 4, tallTree: 2, jump: 1, thickSnow: 1, rock: 1};
var difficultyIntervalMs = 30000;
var difficultyIncreaseRate = 0.2;
var maxDifficultyMultiplier = 6;
var densityBaselineWidth = 1500;
var gameTickMs = 20;
var activeRideTimeMs = 0;
var hudUpdateIntervalMs = 100;
var lastHudUpdateAt = 0;
if (localStorage.getItem('highScore')) highScore = localStorage.getItem('highScore');

function getDifficultyMultiplier() {
	var steps = Math.floor(activeRideTimeMs / difficultyIntervalMs);
	return Math.min(Math.pow(1 + difficultyIncreaseRate, steps), maxDifficultyMultiplier);
}

function getObstacleDropRate(obstacleName) {
	return dropRates[obstacleName] * getDifficultyMultiplier() * getViewportDensityMultiplier();
}

function getViewportDensityMultiplier() {
	return mainCanvas.width / densityBaselineWidth;
}

function loadImages (sources, next) {
	var loaded = 0;
	var images = {};

	function finish () {
		loaded += 1;
		if (loaded === sources.length) {
			next(images);
		}
	}

	sources.each(function (src) {
		var im = new Image();
		im.onload = finish;
		im.src = src;
		console.log(src, im)
		dContext.storeLoadedImage(src, im);
	});
}

function monsterHitsSkierBehaviour(monster, skier) {
	skier.isEatenBy(monster, function () {
		livesLeft -= 1;
		monsterActive = false;
		monster.isFull = true;
		monster.isEating = false;
		skier.isBeingEaten = false;
		monster.setSpeed(skier.getSpeed());
		monster.stopFollowing();
		var randomPositionAbove = dContext.getRandomMapPositionAboveViewport();
		monster.setMapPositionTarget(randomPositionAbove[0], randomPositionAbove[1]);
	});
}

function startNeverEndingGame (images) {
	var player;
	var startSign;
	var infoBox;
	var game;

	function updateHud (force) {
		var now = Date.now();
		if (!force && now - lastHudUpdateAt < hudUpdateIntervalMs) return;

		lastHudUpdateAt = now;
		if (window.BikeFreeScores) window.BikeFreeScores.updateDistance(distanceTravelledInMetres);
		infoBox.setLines([
			// 'Bike Free',
			infoBoxControls,
			// 'Travelled ' + distanceTravelledInMetres + 'm',
			// 'High Score: ' + highScore,
			'Bikers left: ' + livesLeft
		]);
	}

	function resetGame () {
		distanceTravelledInMetres = 0;
		activeRideTimeMs = 0;
		lastHudUpdateAt = 0;
		livesLeft = 3;
		highScore = localStorage.getItem('highScore');
		game.reset();
		game.addStaticObject(startSign);
		if (window.BikeFreeScores) window.BikeFreeScores.reset();
		updateHud(true);
	}

	function detectEnd () {
		if (!game.isPaused()) {
			if (window.BikeFreeScores) window.BikeFreeScores.submit(distanceTravelledInMetres);
			var savedHighScore = Number(localStorage.getItem('highScore')) || 0;
			if (Number(distanceTravelledInMetres) > savedHighScore) {
				highScore = distanceTravelledInMetres;
				localStorage.setItem('highScore', highScore);
			} else {
				highScore = savedHighScore;
			}
			infoBox.setLines([
				'Game over!',
				'Hit space to restart'
			]);
			game.pause();
			game.cycle();
		}
	}

	function randomlySpawnNPC(spawnFunction, dropRate) {
		var rateModifier = Math.max(800 - mainCanvas.width, 0);
		if (Number.random(1000 + rateModifier) <= dropRate) {
			spawnFunction();
		}
	}

	function getRandomMonsterSpawnPosition() {
		var sideBuffer = 80;
		var xCanvas = Math.random() < 0.5 ? -sideBuffer : mainCanvas.width + sideBuffer;
		var yCanvas = mainCanvas.height * (0.35 + (Math.random() * 0.15));
		return dContext.canvasPositionToMapPosition([xCanvas, yCanvas]);
	}

	function spawnMonster () { // set flag so only one monster at a time?
		if(!monsterActive){
			var newMonster = new Monster(sprites.monster);
			var randomPosition = getRandomMonsterSpawnPosition();
			monsterActive = true;
			newMonster.setMapPosition(randomPosition[0], randomPosition[1]);
			newMonster.follow(player);
			newMonster.setSpeed(player.getStandardSpeed() + 3);
			newMonster.onHitting(player, monsterHitsSkierBehaviour);
			console.log('monster spawned!');
			game.addMovingObject(newMonster, 'monster');
		}
	}

	function spawnBoarder () {
		var newBoarder = new Snowboarder(sprites.snowboarder);
		var randomPositionAbove = dContext.getRandomMapPositionAboveViewport();
		var randomPositionBelow = dContext.getRandomMapPositionBelowViewport();
	
		newBoarder.setMapPosition(randomPositionBelow[0], randomPositionBelow[1]);
		newBoarder.setMapPositionTarget(randomPositionAbove[0], randomPositionAbove[1]);
		newBoarder.onHitting(player, sprites.snowboarder.hitBehaviour.skier);

		game.addMovingObject(newBoarder);
	}

	player = new Skier(sprites.skier);
	player.setMapPosition(0, 0);
	player.setMapPositionTarget(0, -10);

	if ( loseLifeOnObstacleHit ) {
		player.setHitObstacleCb(function() {
			livesLeft -= 1;
		});
	}

	game = new Game(mainCanvas, player);
	game.setBackgroundImage(backgroundImageSource);
	game.setStartHeaderImage(startHeaderImageSource);
	document.addEventListener('bikefree:pause', game.pause);
	document.addEventListener('bikefree:resume', game.resume);

	startSign = new Sprite(sprites.signStart);
	game.addStaticObject(startSign);
	startSign.setMapPosition(-50, 0);
	dContext.followSprite(player);

	infoBox = new InfoBox({
		initialLines : [
			// 'Bike Free',
			infoBoxControls,
			// 'Travelled 0m',
			// 'High Score: ' + highScore,
			'Bikers left: ' + livesLeft
		],
		position: {
			top: 15,
			right: 10
		}
	});

	game.beforeCycle(function () {
		var newObjects = [];
		if (player.isMoving) {
			if (!game.isPaused()) activeRideTimeMs += gameTickMs;
			newObjects = Sprite.createObjects([
				{ sprite: sprites.smallTree, dropRate: getObstacleDropRate('smallTree') },
				{ sprite: sprites.tallTree, dropRate: getObstacleDropRate('tallTree') },
				{ sprite: sprites.jump, dropRate: dropRates.jump },
				{ sprite: sprites.thickSnow, dropRate: getObstacleDropRate('thickSnow') },
				{ sprite: sprites.rock, dropRate: getObstacleDropRate('rock') },
			], {
				rateModifier: 0,
				position: function () {
					return dContext.getRandomMapPositionInFrontOfSprite(player);
				},
				player: player
			});
		}
		if (!game.isPaused()) {
			game.addStaticObjects(newObjects);

			randomlySpawnNPC(spawnBoarder, 0.1);
			distanceTravelledInMetres = parseFloat(player.getPixelsTravelledDownMountain() / pixelsPerMetre).toFixed(1);
			updateHud(false);

			if (distanceTravelledInMetres > monsterDistanceThreshold) {
				randomlySpawnNPC(spawnMonster, 0.001);
			}
		}
	});

	game.afterCycle(function() {
		if (livesLeft === 0) {
			detectEnd();
		}
	});

	game.addUIElement(infoBox);
	
	$(mainCanvas)
	.mousemove(function (e) {
		game.setMouseX(e.pageX);
		game.setMouseY(e.pageY);
		player.resetDirection();
		player.startMovingIfPossible();
	})
	.bind('click', function (e) {
		game.setMouseX(e.pageX);
		game.setMouseY(e.pageY);
		player.resetDirection();
		player.startMovingIfPossible();
	})
	.focus(); // So we can listen to events immediately

	Mousetrap.bind('f', player.speedBoost);
	Mousetrap.bind('t', player.attemptTrick);
	Mousetrap.bind(['w', 'up'], function () {
		player.stop();
	});
	Mousetrap.bind(['a', 'left'], function () {
		if (player.direction === 270) {
			player.stepWest();
		} else {
			player.turnWest();
		}
	});
	Mousetrap.bind(['s', 'down'], function () {
		player.setDirection(180);
		player.startMovingIfPossible();
	});
	Mousetrap.bind(['d', 'right'], function () {
		if (player.direction === 90) {
			player.stepEast();
		} else {
			player.turnEast();
		}
	});
	Mousetrap.bind('m', spawnMonster);
	Mousetrap.bind('b', spawnBoarder);

	function setTouchTarget(e) {
		var center = (e.gesture && e.gesture.center) || e.center;
		if (!center) return false;
		game.setMouseX(center.x);
		game.setMouseY(center.y);
		return true;
	}

	var hammertime = Hammer(mainCanvas).on('press', function (e) {
		e.preventDefault();
		setTouchTarget(e);
	}).on('tap', function (e) {
		player.attemptTrick();
		setTouchTarget(e);
	}).on('pan', function (e) {
		if (setTouchTarget(e)) {
			player.resetDirection();
			player.startMovingIfPossible();
		}
	}).on('doubletap', function (e) {
		player.speedBoost();
	});

	player.isMoving = false;
	player.setDirection(270);

	game.start();
}

function resizeCanvas() {
	var frame = mainCanvas.parentNode;
	var width = frame.clientWidth;
	var height = frame.clientHeight;
	mainCanvas.width = width;
	mainCanvas.height = height;
	mainCanvas.style.width = width + 'px';
	mainCanvas.style.height = height + 'px';
}

window.addEventListener('resize', resizeCanvas, false);
if (window.ResizeObserver) new ResizeObserver(resizeCanvas).observe(mainCanvas.parentNode);

resizeCanvas();

loadImages(imageSources, startNeverEndingGame);

this.exports = window;
