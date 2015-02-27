mock-spawn
==========

[![Build Status](https://secure.travis-ci.org/gotwarlost/mock-spawn.png)](http://travis-ci.org/gotwarlost/mock-spawn)

An easy-to-use mock for `child_process.spawn`.

### Key ideas

* All mock processes wrap a user-supplied, asynchronous "runner function"
that calls a callback to indicate that the process is "done running"
* You can plug in a "strategy function" that returns runner functions for
handling specific spawn invocations.
* When no specific runner function is found, a default function is used.
The baked-in default returns an exit code of 0 and returns immediately. The
default function may be overridden for fancier behavior.
* All the information on how many times `spawn` was invoked and the details
of every invocation are available as attributes on the mock for later assertions
* Testing simple cases requires no setup whatsoever
* A simple "sequence" strategy for being able to say: do this on the first
invocation, do the other thing on the second invocation and so on is available
for use

### Usage

#### Common cases

```javascript
var mockSpawn = require('mock-spawn');

// override child_process.spawn
// this is a simplistic example; you can use a library like `mockery` to
// set a new instance for every test. See examples/complete/test.js
var mySpawn = mockSpawn();
require('child_process').spawn = mySpawn;

// at this point you have mocked child_process.spawn to always exit 0
// and write nothing to stdout or stderr

// let's change the default processing to exit 1 always and write something
// to stdout
mySpawn.setDefault(mySpawn.simple(1 /* exit code */, 'hello world' /* stdout */));

// let's tell the mock to do specific things on sequential calls
// in this case we exit 0 on the first call, 1 on the second call and so on
mySpawn.sequence.add(mySpawn.simple(0));
mySpawn.sequence.add(mySpawn.simple(1));
mySpawn.sequence.add(function (cb) {
    setTimeout(function () { return cb(2); }, 2000);
});
mySpawn.sequence.add(function (cb) {
    // test the error handling of your library
    this.emit('error', new Error('spawn ENOENT');
    setTimeout(function() { return cb(8); }, 10);
});
mySpawn.sequence.add({throws:new Error('spawn ENOENT')});

// the fourth call to spawn will use the default function we set up to exit 1

// the fifth call to spawn will emit an error and emit exit with code 8 on the
// next tick of the event loop

// the sixth call to spawn will throw an error synchronously

// call your test library here that invokes spawn the way you expect it to
lib.doSomething(function (err) {
    /* after the test is done running, you can make assertions like so */
    assert.equal(6, mySpawn.calls.length);
    var firstCall = mySpawn.calls[0];
    assert.equal('ls', firstCall.command);
    assert.deepEqual([ '-l' ], firstCall.args);
    assert.equal(0, firstCall.exitCode);
});

```

#### Getting fancy with custom strategies


```javascript
var mockSpawn = require('mock-spawn');

// basic stuff
var mySpawn = mockSpawn();
require('child_process').spawn = mySpawn;

// we are now testing if our library under test retries spawn commands on error
// when executing the `foo` command

var count = 0;
mySpawn.setStrategy(function (command, args, opts) {
    if (command !== 'foo') { return null; } // use default
    if (++count < 3) {
        return mySpawn.simple(1); //exit 1 immediately
    }
    return function (cb) {
        this.stdout.write('output data my library expects');
        return cb(0); // and exit 0
    };
});

```

### API

#### The runner function

The runner function accepts a single callback that needs to be called with an
exit code and optionally a signal name. If you define a `throws` property on
the runner object, it will throw that error synchronously to mimic the
behavior of `child_process.spawn`. It will ignore everything else in this case,
and it will not "run" at all. 
**CAVEAT**: The `throws` value *must* be an instanceof `Error`.

The runner function has access to the following attributes via `this`
* `this.stdout` - the standard output of the process to which it can write
* `this.stderr` - the standard error of the process to which it can write
* `this.command` - the command for the `spawn` call
* `this.args` - the args for the `spawn` call
* `this.opts` - the options object passed to the `spawn` call
* `this.emit` - the emit method of the underlying `EventEmitter`

The process "runs" until the runner calls the callback.

#### The strategy function

The strategy function accepts 3 arguments: the command, args and options passed
to the `spawn` invocation. It can inspect these to return a customized runner
for just that invocation.

It can also return a falsy value to indicate that the default function should
be used.

####  var mySpawn = require('mock-spawn')([verbose])

returns a function that can be plugged into `child_process` as a replacement
for `spawn`

* verbose - true to see additional debug messages from this library

#### var fn = mySpawn.simple(exit-code, [output-data], [error-data])

returns a runner function that exits with the specified code and writes
specific data to the output and error streams

Arguments are:
* exit-code: exit code for the process
* output-data: the data to be written to standard output
* error-data: the data to be written to standard error

#### mySpawn.setDefault(fn)

sets the default processing of all spawn invocations to use the runner function
specified

* fn - a runner function to handler default processing

#### mySpawn.sequence.add(fn)

enables the `sequence` strategy and calls the runner function supplied at the
specific point in the sequence.

* fn - the runner function to use. The nth call to `add` plugs a runner function
for the nth invocation to `spawn`

Do **not** mix `sequence.add` and `setStrategy` calls for a specific run.

#### mySpawn.setStrategy(fn)

sets `fn` as the strategy that will return runner functions on demand.

* fn - the function to be used as the strategy function.

Do **not** mix `sequence.add` and `setStrategy` calls for a specific run.

#### mySpawn.setSignals(obj)

sets `obj` as a lookup table for whether to exit. If the value is `true`,
then the runner will emit `exit` with code `null` and signal `<signal>`.

* obj - the object with signal names and whether to exit.

#### mySpawn.calls

array of mock process objects that you can use to inspect how your library
under test invoked `spawn`. Every object has the following properties available

* `command` - the command
* `args` - the command arguments
* `opts` - the options passed to the spawn invocation
* `exitCode` - the exit code of the process
* `signal` - the signal delivered to the process (simulated via the runner)

### License

BSD. See accompanying LICENSE file.

### Third-party libraries

The following third-party libraries are used by this module:

* through: https://github.com/dominictarr/through

### TODO

Pull requests welcome!

 * `child_process.fork` and `child_process.exec` processing
 * strategy functions on `process.kill`


