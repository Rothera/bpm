#!/usr/bin/env python3
# -*- coding: utf-8 -*-
################################################################################
##
## This file is part of BetterPonymotes.
## Copyright (c) 2015 Typhos.
##
## This program is free software: you can redistribute it and/or modify it
## under the terms of the GNU Affero General Public License as published by
## the Free Software Foundation, either version 3 of the License, or (at your
## option) any later version.
##
## This program is distributed in the hope that it will be useful, but WITHOUT
## ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
## FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License
## for more details.
##
## You should have received a copy of the GNU Affero General Public License
## along with this program.  If not, see <http://www.gnu.org/licenses/>.
##
################################################################################

import argparse
import zipfile

import lxml.etree

XpiKey = """
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCZnk8XNNC6+pmDqxY/5CzREJXj
BUY2JzvtcIMBH9gvyq7ZoOdCHIxm2rew7jZ76zdJfKlsUXI2tEdvR5C5PI4NBCw7
PGm6yzGLSn8/cG7tG9XvpnyxGAX8TfQyV602NhAucqJXYGvCNePalZGU7FJbeJc1
5JjoU+fv8mFBK/QTAwIDAQAB
"""

def make_rdf_element(tag, text=None):
    e = lxml.etree.Element("{http://www.mozilla.org/2004/em-rdf#}" + tag)
    if text:
        e.text = text
    return e

def inject_update_key(manifest):
    manifest[0].append(make_rdf_element("updateKey", XpiKey))

def inject_seamonkey_target(manifest):
    target_app_tag = make_rdf_element("targetApplication")
    description_tag = lxml.etree.Element("Description")
    id_tag = make_rdf_element("id", "{92650c4d-4b8e-4d2a-b7eb-24ecf4f6b63a}")
    min_version_tag = make_rdf_element("minVersion", "2.0")
    max_version_tag = make_rdf_element("maxVersion", "2.39")

    description_tag.append(id_tag)
    description_tag.append(min_version_tag)
    description_tag.append(max_version_tag)

    target_app_tag.append(description_tag)
    manifest[0].append(target_app_tag)

def munge_install_rdf(input_filename, output_filename):
    xpi_in = zipfile.ZipFile(input_filename, "r")
    xpi_out = zipfile.ZipFile(output_filename, "w", compression=zipfile.ZIP_DEFLATED)

    for item in xpi_in.infolist():
        data = xpi_in.read(item.filename)

        if item.filename == "install.rdf":
            item = "install.rdf"

            manifest = lxml.etree.fromstring(data)
            inject_update_key(manifest)
            inject_seamonkey_target(manifest)
            data = lxml.etree.tostring(manifest, encoding=str, pretty_print=True)

        xpi_out.writestr(item, data)

    xpi_in.close()
    xpi_out.close()

def main():
    parser = argparse.ArgumentParser(description="Munge XPI")
    parser.add_argument("input")
    parser.add_argument("output")
    args = parser.parse_args()

    munge_install_rdf(args.input, args.output)

if __name__ == "__main__":
    main()
