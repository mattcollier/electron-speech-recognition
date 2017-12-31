# electron-voice-recognition

This is a demonstration project that shows how the [Media Stream API][1] in
Chromium can be brought together with the [Google's Cloud Speech API][2] to
enable speech recognition in an [Electron][3] application.

## Installation
### Linux (Debian/Ubuntu)
You will need the c/c++ toolchain for building node/electron native add-ons.

The [snowboy][4] native add-on has some build dependencies:
```
sudo apt-get install libmagic-dev libatlas-base-dev
```

Clone and install
```
git clone https://github.com/mattcollier/electron-voice-recognition.git
npm install
# the grpc native binary folder needs to be renamed
./rename-grpc-binary.sh
npm start
```

## Usage
After launching the application, speak the default hotword "Alexa" followed
immediately by up to 10 seconds of speech that will be transcribed by Google
Cloud Speech.

[1]: https://developer.mozilla.org/en-US/docs/Web/API/Media_Streams_API
[2]: https://cloud.google.com/speech/
[3]: https://electronjs.org/
[4]: https://github.com/kitt-ai/snowboy
