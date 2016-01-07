#!/usr/bin/env node

var multimeter = require('multimeter'),
	comms = require('comms')(),
	prettysize = require('prettysize'),
	argv = require('yargs')
		.alias('p', 'port').default('p', 6457).describe('p', 'Connect to this port')
		.alias('h', 'host').default('h', '127.0.0.1').describe('h', 'Connect to this host')
		.help('help').usage('Usage: $0')
		.argv;

var multi = multimeter(process);

var bars = [], title, donex=0, doney=0;

process.stdout.on('resize', init);

function init() {
	multi.charm.reset();
	multi.write(title+'\n            WRITE                             READ\n');

	var col=0, row=2, rows = process.stdout.rows, cols = Math.floor(process.stdout.columns / 80);

	for (var i = 0; i < bars.length; i++) {
		if (++row > rows) {
			if (++col >= cols) return;
			row = 0;
		}

		if (bars[i].writable) {
			bars[i].writable.x = (col * 80) + 12;
			bars[i].writable.y = row;
		}
		if (bars[i].readable) {
			bars[i].readable.x = (col * 80) + 46;
			bars[i].readable.y = row;
		}

		multi.charm.position(col * 80, row);
		if (bars[i].stream.hr) {
			multi.write('-----' + bars[i].label);
			for (var n = 0; n < 80-6-bars[i].label.length; n++) multi.write('-');
		} else {
			multi.write(bars[i].label);
		}
	}

	multi.charm.position(donex = col * 80, doney = row+1);
	multi.write('Done 0\n');
}

comms.on('init', function(msg) {
	if (msg.streams) {
		bars = [];
		for (var i = 0; i < msg.streams.length; i++) {
			add(msg.streams[i]);
		}
	}
	title = msg.title || 'oilspill';
	init();

	for (var i = 0; i < bars.length; i++) {
		updateStream(i, 'writable', msg.streams[i].writable);
		updateStream(i, 'readable', msg.streams[i].readable);
	}
});

comms.on('disconnected', function() {
	multi.charm.background('red');
	multi.charm.position(70, 1).write('stopped');
	multi.charm.background('black');
	bot();
});

comms.on('update', function(msg) {
	for (var i in msg) {
		updateStream(i, 'writable', msg[i].writable);
		updateStream(i, 'readable', msg[i].readable);
	}
});

comms.on('done', function(msg) {
	multi.charm.position(donex + 5, doney).write(msg.count+'');
	bot();
});


function add(stream) {


	if (stream.readable) {
		var rbar = multi(46, bars.length + 3, {
			width: 20
		});
	}

	if (stream.writable) {
		var wbar = multi(12, bars.length + 3, {
			width: 20
		});
	}


	bars.push({
		label: stream.name || '',
		readable: rbar,
		writable: wbar,
		stream: stream
	});

	return stream;
}

function updateStream(i, type, state) {

	if (bars[i] && bars[i][type]) {
		var line = bars[i];

		var len = state.len, max = state.max;
		if (!line.stream.objectMode) {
			len = prettysize(len, true, true);
			max = prettysize(max, true, true);
		}

		var bar = line[type];
		bar.solid.background = state.len > state.max ? 'red' : 'blue';
		bar.ratio(Math.min(state.max, state.len), state.max, len + ' / ' + max + ' ');
	}
}

function bot() {
	multi.charm.position(0, bars.length+4);
}

console.log('Connecting...');
comms.connect(argv.port, argv.host);
