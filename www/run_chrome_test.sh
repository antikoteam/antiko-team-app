#!/bin/bash
# start headless chrome locally, let it click the button and take a screenshot and log console
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --headless --disable-gpu --dump-dom http://localhost:8080 > dom.html 2>&1
