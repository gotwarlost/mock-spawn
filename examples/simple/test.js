/*
 Copyright 2014 Yahoo! Inc. All rights reserved.
 Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
'use strict';
var assert = require('assert'),
    child_process = require('child_process'),
    mockSpawn = require('../../index'),
    lib = require('./lib'),
    spawn = mockSpawn();

child_process.spawn = spawn;
spawn.sequence.add(spawn.simple(0, 'Hello', 'Goodbye'));
lib.run('echo', [ 'hello', 'world' ], function (err) {
    assert(!err);
    var call = spawn.calls[0];
    assert.equal(call.command, 'echo');
    assert.deepEqual(call.args, [ 'hello', 'world' ]);
    console.log('tests passed!');
});

var cbcalled = false;
spawn.sequence.add(function(cb){
    this.emit('error', new Error('spawn ENOENT'));
    process.nextTick(function(){
        cb(-1);
        cbcalled = true;
    });
});

lib.run('echo2', ['Hello','World'],function(err) {
    assert(err);
    assert.equal(err.message,'spawn ENOENT');
    var call = spawn.calls[1];
    assert.equal(call.command, 'echo2');
    assert.deepEqual(call.args, ['Hello','World']);
    assert(!cbcalled);
    console.log('emit strategy worked!');
});


spawn.sequence.add({throws:new Error('spawn ENOENT')});

lib.run('echo3', ['Hello','World'],function(err) {
    assert(err);
    assert.equal(err.message,'spawn ENOENT');
    var call = spawn.calls[2];
    assert.equal(call.command, 'echo3');
    assert.deepEqual(call.args, ['Hello','World']);
    console.log('throw strategy worked!');
});
