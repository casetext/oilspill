var multimeter = require('multimeter')
	, prettysize = require('prettysize');

var multi = multimeter(process);

var bars = [];

function monitor(pipeline, options) {
	options = options || {};
	if (Array.isArray(pipeline)) {
		for (var i = 0; i < pipeline.length; i++) {
			add((options.names && options.names[i]) || pipeline[i].name || pipeline[i].constructor.name, pipeline[i]);
		}
	} else if (pipeline && (pipeline.readable || pipeline.writable)) {
		addStreams(pipeline);
	} else {
		throw new TypeError('Please provide an array of streams or the first stream in the pipeline.');
	}

	return pipeline;
}

function addStreams(stream) {
	add(stream.name || stream.constructor.name, stream);
	if (stream._readableState && stream._readableState.pipesCount) {
		if (stream._readableState.pipesCount == 1) {
			addStreams(stream._readableState.pipes);
		}
	}
}

function add(name, stream) {


	if (stream._readableState) {
		var rbar = multi(46, bars.length + 3, {
			width: 20
		});
	}

	if (stream._writableState) {
		var wbar = multi(12, bars.length + 3, {
			width: 20
		});
	}


	bars.push({
		label: name,
		readable: rbar,
		writable: wbar,
		stream: stream
	});

	return stream;
}

var poll;
function start(title, frequency) {
	if (poll) {
		stop();
	}
	multi.charm.reset();
	multi.write(title+'\n            WRITE                             READ\n');
	for (var i = 0; i < bars.length; i++) {
		multi.write(bars[i].label + '\n');
	}
	multi.write('Done 0\n');
	poll = setInterval(update, frequency || 250);
}

function stop() {
	clearInterval(poll);
	poll = null;
}

function update() {
	for (var i = 0; i < bars.length; i++) {
		if (bars[i].stream) {
			updateStream(i, 'writable');
			updateStream(i, 'readable');
		}
	}
}

function updateStream(i, type) {
	var state = bars[i].stream['_' + type + 'State'];

	if (bars[i][type]) {
		var len = state.length, max = state.highWaterMark;
		if (!state.objectMode) {
			len = prettysize(len, true, true);
			max = prettysize(max, true, true);
		}

		var bar = bars[i][type];
		bar.solid.background = state.length > state.highWaterMark ? 'red' : 'blue';
		bar.ratio(Math.min(state.highWaterMark, state.length), state.highWaterMark, len + ' / ' + max + ' ');
	}
}

function done(val) {
	if (poll) {
		multi.charm.position(6, bars.length+3).write(val+'').position(0, bars.length+4);
	}
}




exports.done = done;
exports.start = start;
exports.stop = stop;
exports.monitor = monitor;
exports.stream = add;
