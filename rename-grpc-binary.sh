#!/bin/bash
echo Renaming build folder
mv ./node_modules/grpc/src/node/extension_binary/electron-v1.7-linux-x64-{libc} ./node_modules/grpc/src/node/extension_binary/electron-v1.7-linux-x64-glibc
