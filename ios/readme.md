# PonyMotes for iOS

## About
This is an iOS port for BetterPonyMotes, a popular browser extension that brings thousands of emotes to Reddit. This port requires the user to get Alien Blue (somehow) because it is the only iOS app that supports emotes (as far as I know).

## Install
Install the `bpm.deb` file and apply with **Anemone**. *WinterBoard may not work*.
- Please note that installation can take some time, as >15,000 files are being processed. Please be patient!

## Building
To build the DEB file needed for installation, run the `update.sh` script.

### Requirements
- Basic shell commands (`rm`, `mv`, etc.)
- `bzip2`
- XZ Utilities
- `dpkg` (I think this comes with XZ utilities...)
- Python 3.3 or above (for Desktop Ponymotes)
- Third party python modules:
   - requests
   - coloredlogs

## License
PonyMotes for iOS is licensed under the AGPL v3.
 - This project also uses /u/jibodeah's *Desktop Ponymotes* script with his permission.
