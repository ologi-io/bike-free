import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const SpriteArray = require('../../public/game/js/lib/spriteArray');

describe('SpriteArray', function() {
	describe('#push()', function() {
		it('adds items like an array', function() {
			var arr = new SpriteArray();

			arr.push('a');
			arr.push('b');

			expect(arr.length).toBe(2);
			expect(arr[0]).toBe('a');
			expect(arr[1]).toBe('b');
		});

		it('calls push handlers', function() {
			var arr = new SpriteArray();
			var received = [];

			arr.onPush(function(item) { received.push(item); });
			arr.push('x');
			arr.push('y');

			expect(received).toEqual(['x', 'y']);
		});
	});

	describe('#onPush()', function() {
		it('can run a handler for existing items', function() {
			var arr = new SpriteArray();
			var received = [];

			arr.push('existing');
			arr.onPush(function(item) { received.push(item); }, true);

			expect(received).toEqual(['existing']);
		});
	});

	describe('#cull()', function() {
		it('removes deleted items', function() {
			var arr = new SpriteArray();
			var keep = { deleted: false };
			var remove = { deleted: true };

			arr.push(keep);
			arr.push(remove);
			arr.cull();

			expect(arr.length).toBe(1);
			expect(arr[0]).toBe(keep);
		});
	});
});
