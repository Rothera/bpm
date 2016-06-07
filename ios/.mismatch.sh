#!/bin/bash
#read -p "Ready? Make sure you are cd'd to the root of the repo"
echo "Removing old Pacakges and Release files..."
rm -f Package*
echo "Done."
 
echo "Generating new Packages file..."
dpkg-scanpackages debs/ > Packages
bzip2 -fks Packages
cp Packages Packages.backup
gzip -f Packages
mv Packages.backup Packages
echo "Done."
 
echo "Removing old MD5 checksums, byte sizes from Release..."
sed "/Packages/d" < Release > Release2
rm Release
mv Release2 Release
echo "Done."
 
echo -n "Generating MD5 checksums..."
md5Packages=`md5 Packages | sed -e 's/.*MD5 (Packages) = //' -e 's/<.*$//'`
md5Packages_bz2=`md5 Packages.bz2 | sed -e 's/.*MD5 (Packages.bz2) = //' -e 's/<.*$//'`
md5Packages_gz=`md5 Packages.gz | sed -e 's/.*MD5 (Packages.gz) = //' -e 's/<.*$//'`
echo "Done."
echo -n "Calculating byte sizes..."
PackagesBytes=`cat Packages | wc -c | sed -e 's/.*    //' -e 's/<.*$//'`
Packages_bz2Bytes=`cat Packages.bz2 | wc -c | sed -e 's/.*    //' -e 's/<.*$//'`
Packages_gzBytes=`cat Packages.gz | wc -c | sed -e 's/.*    //' -e 's/<.*$//'`
echo "Done."
echo -n "Applying changes to Release..."
echo ' '$md5Packages $PackagesBytes 'Packages' >> Release
echo ' '$md5Packages_bz2 $Packages_bz2Bytes 'Packages.bz2' >> Release
echo ' '$md5Packages_gz $Packages_gzBytes 'Packages.gz' >> Release
echo "Done."
 
echo "Removing .DS_Store files"
find . "-name" ".DS_Store" -exec rm {} \;
echo "Done."
echo ""
 
cat <<EOF
Done.
EOF