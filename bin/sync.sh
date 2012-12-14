#!/bin/sh
################################################################################
##
## Copyright (C) 2012 Typhos
##
## This Source Code Form is subject to the terms of the Mozilla Public
## License, v. 2.0. If a copy of the MPL was not distributed with this
## file, You can obtain one at http://mozilla.org/MPL/2.0/.
##
################################################################################

rm www/*.xpi www/*.oex -v
cp build/*.xpi build/*.oex www -v
cd www
rsync -vvLr --delete ./ ref@mlas1.us:www
echo "Remember to upload the CRX to the Chrome Webstore!"
