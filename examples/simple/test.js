/*
 Copyright 2014 Yahoo! Inc. All rights reserved.
 Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */

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

