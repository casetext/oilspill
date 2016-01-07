oilspill
========

oilspill monitors many streams which have been piped together, allowing you to visualize the overall status of your pipeline.  It shows you how much data is currently buffered in each stream's readable and/or writable buffer.

![oilspill screenshot](https://cloud.githubusercontent.com/assets/354349/12183450/c791b566-b543-11e5-8524-8bb7739c51b4.gif)

A stream with large amounts of data sitting in its read buffer indicates that the stream is slow to process data relative to the other streams in your pipeline.

This is highly useful to identify where you have bottlenecks.

Example
-------

    var Oilspill = require('oilspill');

    // now do something with streams, like...
    var read = fs.createReadStream(process.argv[2]);
    read.pipe(zlib.createGzip()).pipe(fs.createWriteStream('./out.gz'));

    // now set up the monitor by passing in the FIRST stream in the pipeline
    var monitor = new Oilspill(read, {
        name: 'Gzip Test'
    });
    os.start();

Now when your app is running, start the monitor client.  If you've installed oilspill globally (`npm install -g oilspill`):

    $ oilspill

API
---

### `Oilspill(pipeline, options)`
Creates a new monitor server instance.  `pipeline` can be the first stream of a pipeline or an array of streams.  Options:
- `name`: The name of the pipeline (displayed top left in the monitor client)
- `frequency`: How often to update the display.  Defaults to 250ms.

### `Oilspill#add(stream)`
Adds a single stream to the list of monitored streams

### `Oilspill#addStreams(pipeline)`
Adds a pipeline of streams.

### `Oilspill#addBreak(label)`
Adds a break to the list (appears as a line with `------` and the label)

### `Oilspill#update()`
Immediately updates the display.  (This is automatically called every `opts.frequency` ms.)

### `Oilspill#start(port)`
Starts monitoring the streams and opens the server on the specified port (default `6457`).

### `Oilspill#stop()`
Stops monitoring and closes the server.

### `Oilspill#done(count)`
Update the number of processed things.  If no `count` is specified, an internal counter is incremented.

Monitor client
--------------

    Usage: oilspill

    Options:
      -p, --port  Connect to this port                               [default: 6457]

      -h, --host  Connect to this host                        [default: "127.0.0.1"]

      --help      Show help                                                [boolean]