#!/bin/sh
# Zips the extension for the Chrome Web Store: only the files the browser needs.
set -e
cd "$(dirname "$0")/.."
version=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' manifest.json | head -1)
mkdir -p dist
out="dist/boar-md-preview-$version.zip"
rm -f "$out"
zip -q -r "$out" manifest.json md.js content.js style.css options.html options.css options.js icons fonts
echo "$out"
