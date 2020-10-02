#!/bin/sh

echo "Building layer archive..."
cd nodejs || exit
npm install
cd ../

output_zip=slappforge-lambda-debug-layer-"$(date +'%Y-%m-%d')".zip
zip -r "${output_zip}" nodejs
echo "Build Archive: ${output_zip}"
