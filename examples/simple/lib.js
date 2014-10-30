/*
 Copyright 2014 Yahoo! Inc. All rights reserved.
 Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
'use strict';

var child_process = require('child_process');

module.exports = {
    run: function (command, args, cb) {
        var proc, cbCalled = false;
        try{
            proc = child_process.spawn(command, args);
        } catch(e){
            return cb(e);
        }
        proc.stdout.setEncoding('utf8');
        proc.stdout.on('data', function (d) { console.log(d); });
        proc.stderr.on('data', function (d) { console.error(d); });
        proc.on('error', function (e) {
            if(!cbCalled){
                cbCalled = true;
                return cb(e);
            }
        });
        proc.on('exit', function (code) {
            if(!cbCalled){
                cbCalled = true;
                return cb(code === 0 ? null : new Error('Command exited: ' + code));
            }
        });
    }
};
