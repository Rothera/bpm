# Note: This *must* be ran twice on first run.
find . -name .DS_Store -print0 | xargs -0 git rm --ignore-unmatch # Clear cache
rm .DS_Store
rm bpm/.DS_Store
rm bpm/Library/.DS_Store
rm bpm/Library/Themes/.DS_Store
rm bpm/Library/Themes/BPM.theme/.DS_Store
mkdir ~/.ios_ponymotes/tags # Makes tags folder so ponymote script doesn't complain.
cp .config.ini ~/.ios_ponymotes/config.ini # Updates config file.
python .fetch_ponymotes.py # Uses Jibodeah's Desktop Ponymotes to get ponymotes.
mv ~/.ios_ponymotes/tags/ bpm/Library/Themes/BPM.theme/Bundles/com.reddit.alienblue/Subreddits.bundle/mylittlepony/ # Adds ponymotes to BPM-iOS
./.remove.sh # Clears old packages
rm Packages.bz2
./.packages.sh # Builds packages
./.mismatch.sh # Fixes issues with verification for Cydia repo.

dpkg-scanpackages -m . /dev/null >Packages
bzip2 Packages
