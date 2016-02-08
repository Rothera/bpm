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

def munge_install_rdf(rdf, input_filename, output_filename):
    xpi_in = zipfile.ZipFile(input_filename, "r")
    xpi_out = zipfile.ZipFile(output_filename, "w", compression=zipfile.ZIP_DEFLATED)

    for item in xpi_in.infolist():
        data = xpi_in.read(item.filename)

        if item.filename == "install.rdf":
            item = "install.rdf"
            data = rdf

        xpi_out.writestr(item, data)

    xpi_in.close()
    xpi_out.close()

def main():
    parser = argparse.ArgumentParser(description="Munge XPI")
    parser.add_argument("version")
    parser.add_argument("xml")
    parser.add_argument("input")
    parser.add_argument("output")
    args = parser.parse_args()

    with open(args.xml) as file:
        rdf = file.read()
    rdf = rdf.replace("/*{{version}}*/", args.version)

    munge_install_rdf(rdf, args.input, args.output)

if __name__ == "__main__":
    main()
