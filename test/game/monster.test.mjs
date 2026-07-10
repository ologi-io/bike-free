import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Monster = require('../../public/game/js/lib/monster');

describe('Monster', function() {
	afterEach(function() {
		vi.useRealTimers();
	});

	it('starts with the standard speed', function() {
		var monster = new Monster();

		expect(monster.getSpeed()).toBe(6);
	});

	it('starts moving and not eating', function() {
		var monster = new Monster();

		expect(monster.isMoving).toBe(true);
		expect(monster.isEating).toBe(false);
		expect(monster.isFull).toBe(false);
	});

	describe('#startEating()', function() {
		it('stops while eating, then resumes after all stages', function() {
			vi.useFakeTimers();
			var monster = new Monster();
			var done = vi.fn();

			monster.startEating(done);

			expect(monster.isEating).toBe(true);
			expect(monster.isMoving).toBe(false);

			vi.advanceTimersByTime(300 * 6);

			expect(done).toHaveBeenCalledOnce();
			expect(monster.isEating).toBe(false);
			expect(monster.isMoving).toBe(true);
		});
	});
});
