/*
 Copyright 2014 Yahoo! Inc. All rights reserved.
 Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
'use strict';
var spawn = require('child_process').spawn;

module.exports = {
    run: function (command, args, cb) {
        var cbCalled = false,
            proc;
        try{
            proc = spawn(command, args);
        } catch(e){
            return cb(e);
        }
        proc.stdout.setEncoding('utf8');
        proc.stdout.on('data', function (d) { console.log(d); });
        proc.stderr.on('data', function (d) { console.error(d); });
        proc.on('exit', function (code, sig) {
            if(!cbCalled){
                cbCalled = true;
                if(sig){
                    return cb(new Error(sig));
                }
                return cb(code === 0 ? null : new Error('Command exited: ' + code));
            }
        });
        proc.on('error', function (e) {
            if(!cbCalled){
                cbCalled = true;
                return cb(e);
            }
        });
        return proc;
    }
};
