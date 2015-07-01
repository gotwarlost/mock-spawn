'use strict';
/*
Copyright 2014 Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
*/

/*jslint nomen: true */
var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    through = require('through'),
    stream = require('stream'),
    lastPid = 1;

function MockProcess(runner, signals) {
    var that = this,
        streamer = function () {
            /* istanbul ignore next - fallback */
            return stream.PassThrough ? new stream.PassThrough() : through();
        },
        emitted = false,
        emitter = function () {
            if (!emitted) {
                emitted = true;
                that.emit('close', that.exitCode, that.signal);
            }
        };
    EventEmitter.call(this);
    this.stdin = streamer();
    this.stdout = streamer();
    this.stderr = streamer();

    this.stderr.on('end', emitter);
    this.stderr.on('finish', emitter);
    this.stderr.on('close', emitter);

    /* istanbul ignore next - polyfill */
    if (!this.stdout.setEncoding) {
        this.stdout.setEncoding = this.stderr.setEncoding = function (encoding) {
            this.encoding = encoding;
        };
    }
    this._runner = runner;
    this.signal = null;
    if(signals){
        this.signals = signals;
    }
}

util.inherits(MockProcess, EventEmitter);

MockProcess.prototype._start = function (command, args, opts) {
    var that = this,
        runner = this._runner;

    this.command = command;
    this.args = args;
    this.opts = opts;
    this.pid = lastPid;
    this.ended = false;
    lastPid += 1;

    if(runner.throws instanceof Error){
        throw runner.throws;
    }
    process.nextTick(function () {
        runner.call(that, function (exitCode) {
            if(!that.ended){
                that.ended = true;
                that.exitCode = exitCode;
                that.emit('exit', exitCode);
                that.stdout.end();
                that.stderr.end();
            }
        });
    });
    return this;
};

MockProcess.prototype.kill = function (signal) {
    signal = signal || 'SIGTERM';
    var that = this;
    // if the signals object contains this signal and is *truthy*, and it is still running, exit
    if(this.signals[signal]){
        this.signal = signal;
        /* istanbul ignore else - no-op if ended */
        if(!this.ended){
            this.ended = true;
            process.nextTick(function(){
                that.emit('exit',null,signal);
                that.stdout.end();
                that.stderr.end();
            });
        }
    }
};

var ezRunner = function (exitCode, stdout, stderr) {
    var verbose,
        fn = function (cb) {
            if (verbose) {
                console.log('Run:' + this.command + ', with args');
                console.log(this.args);
                console.log('With stdout = ' + stdout);
                console.log('With stderr = ' + stderr);
                console.log('Exit code = ' + exitCode);
            }
            if (stdout) {
                this.stdout.write(stdout);
            }
            if (stderr) {
                this.stderr.write(stderr);
            }
            process.nextTick(function () {
                return cb(exitCode);
            });
        };
    fn.setVerbose = function (v) {
        verbose = !!v;
        return fn;
    };
    return fn;
};

function makeSeq(verbose) {
    var runners = [],
        fn = function (/* command, args, opts */) {
            var runner;
            if (runners.length) {
                if (verbose) {
                    console.log('Running first of ' + runners.length +
                        ' remaining functions');
                }
                runner = runners.shift();
            } else if (verbose) {
                console.log('No runners left, using default');
            }
            return runner;
        };

    fn.add = function (runner) {
        runners.push(runner);
    };
    return fn;
}

function ProcessList(verbose) {
    this.verbose = verbose;
    this.fns = [];
    this.defaultFn = ezRunner(0).setVerbose(verbose);
    this.strategy = null;
    this.calls = [];
}

ProcessList.prototype.setStrategy = function (strategy) {
    this.strategy = strategy;
};

ProcessList.prototype.setSignals = function (sigs) {
    this.signals = sigs;
};

ProcessList.prototype.next = function (command, args, opts) {
    var runner,
        mp;

    if (this.strategy) {
        runner = this.strategy(command, args, opts);
    }
    runner = runner || this.defaultFn;
    mp = new MockProcess(runner,this.signals);
    this.calls.push(mp);
    return mp._start(command, args, opts);
};

ProcessList.prototype.__defineGetter__('sequence', function () {
    if (!this.strategy) {
        this.strategy = makeSeq(this.verbose);
    }
    return this.strategy;
});

module.exports = function (verbose) {
    var pm = new ProcessList(verbose),
        main = function (command, args, opts) {
            return pm.next(command, args, opts);
        };

    main.__defineGetter__('sequence', function () { return pm.sequence; });
    main.__defineGetter__('calls', function () { return pm.calls.slice(); });
    main.setDefault = function (fn) { pm.defaultFn = fn; };
    main.setStrategy = function (s) { pm.setStrategy(s); };
    main.simple = function (exitCode, stdout, stderr) {
        return ezRunner(exitCode, stdout, stderr).setVerbose(verbose);
    };
    main.setSignals = function (sigs) { pm.setSignals(sigs); };

    return main;
};
