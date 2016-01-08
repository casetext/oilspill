var Comms = require('comms'),
	EventEmitter = require('events');

function PipelineInspector(pipeline, opts) {
	var self = this;
	self.comms = new Comms();
	self.streamInfo = [];
	self.streams = [];
	self.doneCount = 0;
	self.opts = opts || {};


	if (Array.isArray(pipeline)) {
		for (var i = 0; i < pipeline.length; i++) {
			self.add((options.names && options.names[i]) || pipeline[i].name || pipeline[i].constructor.name, pipeline[i]);
		}
	} else if (pipeline && (pipeline.readable || pipeline.writable)) {
		this.addStreams(pipeline);
	} else {
		throw new TypeError('Please provide an array of streams or the first stream in the pipeline.');
	}


	self.comms.on('connection', function(socket) {
		socket.send('init', {
			title: self.opts.name,
			streams: self.streamInfo
		});
	});

	self.poll = setInterval(function() {
		self.update();
	}, self.opts.frequency || 250);
}

PipelineInspector.prototype.addStreams = function(stream) {
	
	this.add(stream);

	if (stream._readableState && stream._readableState.pipesCount) {
		if (stream._readableState.pipesCount == 1) {
			this.addStreams(stream._readableState.pipes);
		}
	}
};

PipelineInspector.prototype.add = function(name, stream) {
	var self = this;
	if (typeof name != 'string') {
		stream = name;
		name = stream.name || stream.constructor.name;
	}
	var o = {
		name: name,
		objectMode: false
	};

	if (stream._readableState) {
		o.readable = {
			len: stream._readableState.length,
			max: stream._readableState.highWaterMark
		};
		if (stream._readableState.objectMode) o.objectMode = true;
	}
	if (stream._writableState) {
		o.writable = {
			len: stream._writableState.length,
			max: stream._writableState.highWaterMark
		};
		if (stream._writableState.objectMode) o.objectMode = true;
	}


	self.streamInfo.push(o);
	var idx = self.streams.push(stream) - 1;


	stream.on('error', onerror);
	function onerror(err) {
		self.streamInfo[idx].err = true;
		self.comms.send('errored', {i:idx});

		stream.removeListener('error', onerror);
		if (EventEmitter.listenerCount(stream, 'error') === 0) stream.emit('error', err);
	}

	return idx;
};

PipelineInspector.prototype.addBreak = function(name) {
	this.streamInfo.push({
		hr: true,
		name: name
	});
	this.streams.push(null);
};

PipelineInspector.prototype.update = function() {
	var self = this,
		updates = {},
		news = false;

	for (var i = 0; i < self.streams.length; i++) {
		if (self.streams[i]) {
			update('writable');
			update('readable');
		}
	}

	function update(type) {
		var state = self.streams[i]['_' + type + 'State'],
			info = self.streamInfo[i][type];

		if (state) {
			var len = state.length,
				max = state.highWaterMark,
				done = type == 'readable' ? state.ended : state.finished;

			if (info.len != len || info.max != max || info.done != done) {
				info.len = len;
				info.max = max;
				info.done = done;
				updates[i] = self.streamInfo[i];
				news = true;
			}
		}
	}

	if (news) self.comms.send('update', updates);
};


PipelineInspector.prototype.start = function(port) {
	this.comms.listen(port || 6457);
};

PipelineInspector.prototype.stop = function(cb) {
	clearInterval(this.poll);
	this.comms.close(cb);
};

PipelineInspector.prototype.done = function(count) {
	if (typeof count == 'undefined') this.doneCount++;
	else this.doneCount = count;

	this.comms.send('done', { count: this.doneCount });
};

exports = module.exports = PipelineInspector;
