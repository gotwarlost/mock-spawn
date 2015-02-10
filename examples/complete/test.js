/*
 Copyright 2014 Yahoo! Inc. All rights reserved.
 Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */

/*jslint nomen: true */
/*globals describe, it, beforeEach, afterEach */
var assert = require('assert'),
    mockery = require('mockery'),
    async = require('async'),
    mockSpawn = require('../../index'),
    spawn,
    libPath = './lib.js',
    lib;

describe('mock-spawn', function () {
    'use strict';

    beforeEach(function () {
        var verbose = false; // make it true to see additional verbose output
        spawn = mockSpawn(verbose);
        mockery.enable({ useCleanCache: true });
        mockery.registerMock('child_process', { spawn: spawn });
        mockery.registerAllowable(libPath, true);
        lib = require(libPath);
    });

    afterEach(function () {
        mockery.deregisterAll();
        mockery.resetCache();
        mockery.disable();
    });

    describe('simple', function () {

        it('always exits 0 when nothing registered', function (done) {
            async.series([
                function (next) { lib.run('foo', [ 'bar', 'baz'], next); },
                function (next) { lib.run('bar', [ 'foo', 'baz'], next); }
            ], function (err) {
                assert.ok(!err);
                assert.equal(spawn.calls.length, 2);
                assert.equal('foo', spawn.calls[0].command);
                assert.deepEqual(spawn.calls[0].args, ['bar', 'baz' ]);
                assert.equal('bar', spawn.calls[1].command);
                assert.deepEqual(spawn.calls[1].args, ['foo', 'baz' ]);
                done();
            });
        });

        it('allows you to change the default behavior', function (done) {
            spawn.setDefault(function (cb) {
                return cb(1);
            });
            lib.run('foo', ['bar'], function (err) {
                assert.ok(!!err);
                assert.equal(1, spawn.calls[0].exitCode);
                done();
            });
        });

        it('allows you to add behavior by sequence of calls to spawn', function (done) {

            //for the first call use easy syntax to exit 0 and produce specific
            //output and error
            spawn.sequence.add(spawn.simple(0, 'output:foo', 'error:bar'));

            //hand-code the second call to show how things work
            spawn.sequence.add(function (cb) {
                this.stdout.write('Second call!');
                //`command`, `args` and `opts` available via `this`
                assert.ok('foo2', this.command);
                this.data = 'XXX';
                return cb(0); //0 is the exit code
            });
            //set up defaults to exit 1 always
            spawn.setDefault(spawn.simple(1));
            async.series([
                function (next) { lib.run('foo',  ['bar', 'baz'], next); },
                function (next) { lib.run('foo2', ['bar', 'baz'], next); },
                function (next) { lib.run('foo3', ['bar', 'baz'], next); }
            ], function (err) {
                assert.ok(!!err);
                assert.equal(spawn.calls.length, 3);
                assert.equal('foo', spawn.calls[0].command);
                assert.deepEqual(spawn.calls[0].args, ['bar', 'baz' ]);
                assert.equal('foo2', spawn.calls[1].command);
                assert.deepEqual(spawn.calls[1].args, ['bar', 'baz' ]);
                assert.equal('XXX', spawn.calls[1].data);
                assert.equal(0, spawn.calls[1].exitCode);
                assert.equal('foo3', spawn.calls[2].command);
                assert.equal(1, spawn.calls[2].exitCode);
                done();
            });
        });

        it('allows you to plugin a handler function at runtime', function (done) {
            var strategy = function (command /* , args, opts */) {
                if (command === 'foo') {
                    return spawn.simple(0);
                }
                return function (cb) {
                    setTimeout(function () {
                        return cb(2);
                    }, 100);
                };
            };
            spawn.setStrategy(strategy);

            async.series([
                function (next) { lib.run('foo', [ 'bar', 'baz'], next); },
                function (next) { lib.run('foo2', [ 'bar', 'baz'], next); }
            ], function (err) {
                assert.ok(!!err);
                assert.equal(spawn.calls.length, 2);
                assert.equal('foo', spawn.calls[0].command);
                assert.deepEqual(spawn.calls[0].args, ['bar', 'baz' ]);
                assert.equal('foo2', spawn.calls[1].command);
                assert.deepEqual(spawn.calls[1].args, ['bar', 'baz' ]);
                assert.equal(2, spawn.calls[1].exitCode);
                done();
            });
        });

        it('allows you to emit an error event at runtime', function(done) {
            var cbcalled = false;
            spawn.sequence.add(function(cb){
                this.emit('error',new Error('spawn ENOENT'));
                process.nextTick(function(){
                    cb(-1);
                    cbcalled = true;
                });
            });
            lib.run('foo', ['', ''], function(err){
                assert.ok(!!err);
                assert(!cbcalled);
                assert.equal(err.message,'spawn ENOENT');
                done();
            });
        });

        it('allows you to throw an error during spawn', function(done) {
            var cbcalled = false, fn = {throws : new Error('spawn ENOENT')};
            spawn.sequence.add(fn);
            lib.run('foo', ['', ''], function(err){
                assert.ok(!!err);
                assert(!cbcalled);
                assert.equal(err.message,'spawn ENOENT');
                done();
            });
        });

        it('allows you to register signal behaviors', function(done) {
            var signal = 'SIGTERM', proc;
            spawn.setSignals({SIGTERM:true,SIGINT:false});
            spawn.sequence.add(function(cb){
                setTimeout(cb,5000);
            });
            proc = lib.run('foo', ['', ''], function(err){
                assert.equal(err.message,signal);
                done();
            });
            proc.kill(signal);
        });

        it('lets you define a signal handler that does not kill the process', function(done) {
            var signal = 'SIGINT', proc;
            spawn.setSignals({SIGTERM:true,SIGINT:false});
            spawn.sequence.add(function(cb){
                setTimeout(cb.bind(null,0),50);
            });
            proc = lib.run('foo', ['', ''], function(err){
                assert.equal(err,null);
                done();
            });
            proc.kill(signal);
        });
    });
});
