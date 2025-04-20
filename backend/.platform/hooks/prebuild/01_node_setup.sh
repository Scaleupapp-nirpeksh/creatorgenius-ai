#!/bin/bash
# Install Node.js 18.x
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
. ~/.nvm/nvm.sh
nvm install 18
nvm use 18
nvm alias default 18