function defineValue(target, name, value) {
	if (!target[name]) {
		Object.defineProperty(target, name, {
			value: value,
			configurable: true,
			writable: true
		});
	}
}

defineValue(Array.prototype, 'each', function(fn) {
	var arr = this;
	this.forEach(function(item, index) {
		fn.call(arr, item, index, arr);
	});
	return this;
});

defineValue(Array.prototype, 'max', function() {
	return Math.max.apply(Math, this);
});

defineValue(Array.prototype, 'remove', function(value) {
	return this.filter(function(item) {
		return item !== value;
	});
});

defineValue(String.prototype, 'first', function() {
	return this.charAt(0);
});

defineValue(String.prototype, 'toNumber', function() {
	return Number(this);
});

defineValue(Object.prototype, 'superior', function(name) {
	var that = this;
	var method = that[name];
	return function() {
		return method.apply(that, arguments);
	};
});

defineValue(Object, 'isString', function(value) {
	return typeof value === 'string' || value instanceof String;
});

defineValue(Object, 'isFunction', function(value) {
	return typeof value === 'function';
});

defineValue(Object, 'merge', function(target, source) {
	target = target || {};
	Object.keys(source || {}).forEach(function(key) {
		if (typeof target[key] === 'undefined') target[key] = source[key];
	});
	return target;
});

defineValue(Number, 'random', function(max) {
	return Math.floor(Math.random() * (max + 1));
});

if (typeof global.navigator === 'undefined') {
	global.navigator = {};
}

global.navigator.vibrate = global.navigator.vibrate || false;
