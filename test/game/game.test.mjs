import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Game = require('../../public/game/js/lib/game');
const Sprite = require('../../public/game/js/lib/sprite');

function makeCanvas() {
	var context = {
		getCentreOfViewport: function() { return 400; },
		canvasPositionToMapPosition: function() { return [0, 0]; },
		followSprite: vi.fn(),
		drawImage: vi.fn(),
		getLoadedImage: vi.fn(),
		mapPositionToCanvasPosition: function() { return [0, 0]; }
	};

	return {
		width: 800,
		height: 600,
		getContext: function() { return context; },
		_context: context
	};
}

function makePlayer() {
	var player = new Sprite();
	var setMapPosition = player.setMapPosition.bind(player);
	player.draw = vi.fn();
	player.cycle = vi.fn();
	player.reset = vi.fn();
	player.setMapPosition = vi.fn(setMapPosition);
	player.setMapPositionTarget = vi.fn();
	player.isJumping = false;
	return player;
}

describe('Game', function() {
	var canvas;
	var player;
	var game;

	beforeEach(function() {
		canvas = makeCanvas();
		player = makePlayer();
		game = new Game(canvas, player);
	});

	describe('#isPaused()', function() {
		it('is not paused initially', function() {
			expect(game.isPaused()).toBe(false);
		});
	});

	describe('#pause()', function() {
		it('marks the game as paused', function() {
			game.pause();

			expect(game.isPaused()).toBe(true);
		});
	});

	describe('#addStaticObject()', function() {
		it('adds an object that is drawn', function() {
			var obj = { data: {}, draw: vi.fn() };

			game.addStaticObject(obj);
			game.draw();

			expect(obj.draw).toHaveBeenCalled();
		});

		it('removes static objects far behind the player', function() {
			var behind = new Sprite();
			var ahead = new Sprite();

			player.direction = 180;
			player.mapPosition = [0, 0, 0];
			behind.setMapPosition(0, -1200, 0);
			ahead.setMapPosition(0, 1200, 0);
			behind.draw = vi.fn();
			ahead.draw = vi.fn();

			game.addStaticObject(behind);
			game.addStaticObject(ahead);
			game.cycle();
			game.draw();

			expect(behind.deleted).toBe(true);
			expect(behind.draw).not.toHaveBeenCalled();
			expect(ahead.deleted).not.toBe(true);
			expect(ahead.draw).toHaveBeenCalled();
		});
	});

	describe('#beforeCycle() / #afterCycle()', function() {
		it('runs callbacks around a cycle', function() {
			var order = [];

			game.beforeCycle(function() { order.push('before'); });
			game.afterCycle(function() { order.push('after'); });
			game.cycle();

			expect(order).toEqual(['before', 'after']);
		});
	});

	describe('#setMouseX() / #setMouseY()', function() {
		it('updates coordinates without throwing during cycle', function() {
			expect(function() {
				game.setMouseX(100);
				game.setMouseY(200);
				game.cycle();
			}).not.toThrow();
		});
	});
});
