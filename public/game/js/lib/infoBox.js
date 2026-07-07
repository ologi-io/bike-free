function InfoBox(data) {
	var that = this;
	var layout = [];
	var layoutKey = '';
	var layoutCanvasWidth = 0;

	that.lines = data.initialLines;

	that.top = data.position.top;
	that.right = data.position.right;
	that.bottom = data.position.bottom;
	that.left = data.position.left;

	that.width = data.width;
	that.height = data.height;

	that.setLines = function (lines) {
		var same = lines.length === that.lines.length;
		for (var i = 0; same && i < lines.length; i += 1) {
			same = lines[i] === that.lines[i];
		}
		if (same) return;

		that.lines = lines;
		layoutKey = '';
	};

	function getLayout (dContext) {
		dContext.font = '11px monospace';
		var key = that.lines.join('\n');
		if (layoutKey === key && layoutCanvasWidth === dContext.canvas.width) return layout;

		var yOffset = 0;
		layout = [];
		that.lines.each(function (line) {
			var fontSize = +dContext.font.slice(0,2);
			var textWidth = dContext.measureText(line).width;
			var textHeight = fontSize * 1.5;
			var xPos, yPos;
			if (that.top) {
				yPos = that.top + yOffset;
			} else if (that.bottom) {
				yPos = dContext.canvas.height - that.top - textHeight + yOffset;
			}

			if (that.right) {
				xPos = dContext.canvas.width - that.right - textWidth;
			} else if (that.left) {
				xPos = that.left;
			}

			yOffset += textHeight;

			layout.push({ line: line, x: xPos, y: yPos });
		});
		layoutKey = key;
		layoutCanvasWidth = dContext.canvas.width;
		return layout;
	}

	that.draw = function (dContext) {
		getLayout(dContext).each(function (item) {
			dContext.fillText(item.line, item.x, item.y);
		});
	};

	return that;
}

if (typeof module !== 'undefined') {
	module.exports = InfoBox;
}
