import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Sprite = require('../../public/game/js/lib/sprite');
const Skier = require('../../public/game/js/lib/skier');

describe('Skier', function() {
	afterEach(function() {
		vi.useRealTimers();
	});

	describe('#hits()', function() {
		it('still hits taller objects while jumping', function() {
			var skier = new Skier();
			var tallSprite = new Sprite({ parts: {}, zIndexesOccupied: [0, 1] });

			skier.setMapPosition(10, 30);
			skier.setCanvasPosition(10, 30);
			skier.setHeight(10);
			skier.setWidth(10);
			skier.hasHitJump();
			tallSprite.setHeight(10);
			tallSprite.setWidth(10);
			tallSprite.setCanvasPosition(10, 30);

			expect(skier.hits(tallSprite)).toBe(true);
		});

		it('does not hit ground-level objects while jumping', function() {
			var skier = new Skier();
			var shortSprite = new Sprite({ parts: {}, zIndexesOccupied: [0] });

			skier.setMapPosition(10, 30);
			skier.setCanvasPosition(10, 30);
			skier.setHeight(10);
			skier.setWidth(10);
			skier.hasHitJump();
			shortSprite.setHeight(10);
			shortSprite.setWidth(10);
			shortSprite.setCanvasPosition(10, 30);

			expect(skier.hits(shortSprite)).toBe(false);
		});
	});

	describe('#turnEast()', function() {
		it('steps through discrete directions from west', function() {
			var skier = new Skier();

			skier.setDirection(270);
			skier.turnEast();
			expect(skier.direction).toBe(240);
			skier.turnEast();
			expect(skier.direction).toBe(195);
			skier.turnEast();
			expect(skier.direction).toBe(180);
		});
	});

	describe('#getSpeedX()', function() {
		it('eases on the x-axis when turning south-east', function() {
			var skier = new Skier();

			skier.setTurnEaseCycles(5);
			skier.setSpeed(4);
			skier.setMapPosition(10, 30);
			skier.setMapPositionTarget(10, 30);
			expect(skier.getSpeedX()).toBe(0);
			skier.setMapPositionTarget(150, 35);

			expect(skier.getSpeedX()).toBe(4 * (0.33 / 5));
			expect(skier.getSpeedX()).toBe(4 * (0.33 / 5) * 2);
		});
	});

	describe('#hasHitObstacle()', function() {
		it('does not allow movement controls while crashed', function() {
			vi.useFakeTimers();
			var skier = new Skier();
			var obstacle = new Sprite({ parts: {}, id: 'rock' });

			skier.hasHitObstacle(obstacle);
			skier.turnEast();
			skier.stepEast();
			skier.startMovingIfPossible();

			expect(skier.hasBeenHit).toBe(true);
			expect(skier.isMoving).toBe(false);

			vi.advanceTimersByTime(1500);
			expect(skier.hasBeenHit).toBe(false);
		});
	});
});
