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

var bars = [];



function init(title) {
	multi.charm.reset();
	multi.write(title+'\n            WRITE                             READ\n');
	for (var i = 0; i < bars.length; i++) {
		if (bars[i].stream.hr) {
			multi.write('-----' + bars[i].label);
			for (var n = 0; n < 80-6-bars[i].label.length; n++) multi.write('-');
			multi.write('\n');
		} else {
			multi.write(bars[i].label + '\n');
		}
	}
	multi.write('Done 0\n');
}

comms.on('init', function(msg) {
	if (msg.streams) {
		bars = [];
		for (var i = 0; i < msg.streams.length; i++) {
			add(msg.streams[i]);
		}
	}
	init(msg.title || 'oilspill');

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
	multi.charm.position(6, bars.length+3).write(msg.count+'');
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
