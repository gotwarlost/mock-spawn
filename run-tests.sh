#!/bin/bash

set -ex

node examples/simple/test.js

node node_modules/istanbul/lib/cli.js cover \
    -x 'examples/**' node_modules/.bin/_mocha \
    -- examples/complete/test.js --reporter tap



