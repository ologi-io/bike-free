import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Sprite = require('../../public/game/js/lib/sprite');

describe('Sprite', function() {
	describe('#setSpeed()', function() {
		it('sets the speed', function() {
			var sprite = new Sprite();

			sprite.setSpeed(5);

			expect(sprite.getSpeed()).toBe(5);
		});
	});

	describe('#setMapPosition()', function() {
		it('sets the map position', function() {
			var sprite = new Sprite();

			sprite.setMapPosition(5, 10);

			expect(sprite.mapPosition).toEqual([5, 10, 0]);
		});
	});

	describe('#setCanvasPosition()', function() {
		it('accepts zero coordinates', function() {
			var sprite = new Sprite();
			sprite.setCanvasPosition(10, 20);

			sprite.setCanvasPosition(0, 0);

			expect(sprite.getCanvasPositionX()).toBe(0);
			expect(sprite.getCanvasPositionY()).toBe(0);
		});
	});

	describe('#cycle()', function() {
		it('moves toward the target at the current speed', function() {
			var sprite = new Sprite();

			sprite.setSpeed(3);
			sprite.setMapPosition(5, 10);
			sprite.setMapPositionTarget(10, 18);
			sprite.cycle();

			expect(sprite.mapPosition[0]).toBe(8);
			expect(sprite.mapPosition[1]).toBe(13);
		});

		it('does not move when stopped', function() {
			var sprite = new Sprite();

			sprite.setSpeed(3);
			sprite.isMoving = false;
			sprite.setMapPosition(5, 10);
			sprite.setMapPositionTarget(10, 18);
			sprite.cycle();

			expect(sprite.mapPosition[0]).toBe(5);
			expect(sprite.mapPosition[1]).toBe(10);
		});
	});

	describe('#hits()', function() {
		it('does not hit when boxes do not intersect', function() {
			var object1 = new Sprite();
			var object2 = new Sprite();

			object1.setCanvasPosition(1, 1);
			object1.setHeight(10);
			object1.setWidth(10);
			object2.setCanvasPosition(15, 15);
			object2.setHeight(10);
			object2.setWidth(10);

			expect(object1.hits(object2)).toBe(false);
		});

		it('hits when boxes intersect', function() {
			var object1 = new Sprite();
			var object2 = new Sprite();

			object1.setCanvasPosition(1, 1);
			object1.setHeight(10);
			object1.setWidth(10);
			object2.setCanvasPosition(3, 3);
			object2.setHeight(10);
			object2.setWidth(10);

			expect(object1.hits(object2)).toBe(true);
			expect(object2.hits(object1)).toBe(true);
		});

		it('uses hitboxes when present', function() {
			var object1 = new Sprite({ parts: {}, hitBoxes: { 0: [0, 5, 10, 10] } });
			var object2 = new Sprite({ parts: {}, hitBoxes: { 0: [0, 5, 10, 10] } });

			object1.setCanvasPosition(0, 0);
			object1.setHeight(10);
			object1.setWidth(10);
			object2.setCanvasPosition(0, 9);
			object2.setHeight(10);
			object2.setWidth(10);

			expect(object1.hits(object2)).toBe(false);
		});
	});
});
