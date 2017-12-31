const path = require('path');
const snowboy = require('snowboy');
const {Detector, Models} = snowboy;
const speech = require('@google-cloud/speech');

// TODO: make configurable via UI
// location of google server credentials
const client = new speech.SpeechClient({
  // your keyfile goes here
  keyFilename: '/home/matt/dev/Speech-7a0f6aa1b14a.json'
});

const ctx = new window.AudioContext();

// this is used to track when audio will be streamed to google
let googleListen = false;

// TODO: make configurable via the UI
const languageCode = navigator.language || 'en-US';
// TODO: make configurable via the UI
// If you want interim results, set this to true
const interimResults = false;
const request = {
  config: {
    encoding: 'LINEAR16',
    sampleRateHertz: 16000,
    languageCode: languageCode,
  },
  interimResults
};

// number of silence frames snowboy detect before closing google stream
const silenceThreshold = 25;

// maximum duration of audio sent to google
// google API has a hard limit of 60 secs
// this is a safety incase silence detection fails to terminate the stream
const googleMaxDuration = 10000;

let recognizeStream;
let silenceIndex = 0;
let googleKiller;

// init snowboy
const models = new Models();
models.add({
  // TODO: make this configurable via the UI
  // setup hotword "alexa"
  file: path.join(__dirname, 'snowboy', 'alexa.umdl'),
  hotwords: 'alexa',
  // or setup hotword "snow boy" said as two words
  // file: path.join(__dirname, 'lib', 'snowboy', 'snowboy.umdl'),
  // hotwords: 'snowboy',
  sensitivity: '0.5',
});

const detector = new Detector({
  resource: path.join(__dirname, 'snowboy', 'common.res'),
  models: models,
  audioGain: 2.0,
  sampleRate: 16000
});

// when snowboy reports an error
detector.on('error', console.error);

// when snowboy detects silence after the hotword
detector.on('silence', function() {
  if(googleListen) {
    silenceIndex++;
    if(silenceIndex > silenceThreshold) {
      stopGoogle();
    }
  }
});

// stop streaming to google
function stopGoogle() {
  googleListen = false;
  clearTimeout(googleKiller);
  silenceIndex = 0;
  recognizeStream.end();
}

// when snowboy detects a hotword
detector.on('hotword', (index, hotword, buffer) => {
  console.log('hotword', index, hotword);
  recognizeStream = client.streamingRecognize(request)
    .on('error', console.error)
    .on('data', data => {
      if(data.results[0]) {
        console.log(data.results[0].alternatives[0].transcript);
      }
    });

  // write the buffered audio immediately after the hotword to google
  recognizeStream.write(buffer);
  // start streaming audio to google
  googleListen = true;

  // make sure recording stops at max limit
  googleKiller = setTimeout(() => {
    if(googleListen) {
      stopGoogle();
    }
  }, googleMaxDuration);
});

navigator.mediaDevices.getUserMedia({audio: true})
  .then(media_stream => {
    media_stream = media_stream;
    // audioIn is a MediaStreamAudioSourceNode which is child of AudioNode
    const vol = ctx.createGain();
    const audioIn = ctx.createMediaStreamSource(media_stream);
    audioIn.connect(vol);
    const recorder = ctx.createScriptProcessor(0, 2, 2);
    recorder.onaudioprocess = audio => {
      // dealing with mono mic, so only need one channel
      const left = audio.inputBuffer.getChannelData(0);
      const downsampled = downsample(left, 44100, 16000);
      // continuously send audio to snowboy for hotword detection
      detector.write(downsampled);

      // only send audio to google after hotword detection
      if(googleListen) {
        recognizeStream.write(downsampled);
      }
    };

    vol.connect(recorder);
    recorder.connect(ctx.destination);
  })
  .catch(err => {
    console.log('getUserMedia failed.', err);
  });

function downsample(floatsArray, sampleRate, outSampleRate) {
  if(outSampleRate == sampleRate) {
    return '';
  }
  if(outSampleRate > sampleRate) {
    throw "downsampling rate show be smaller than original sample rate";
  }
  const sampleRateRatio = sampleRate / outSampleRate;
  const sourceSampleCount = floatsArray.length;
  const newSampleCount = Math.round(sourceSampleCount / sampleRateRatio);
  // establish space for n samples at 2 bytes each
  const buffer = new ArrayBuffer(newSampleCount * 2);
  const view = new Int16Array(buffer);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while(offsetResult < newSampleCount) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    const x = floatsArray.slice(offsetBuffer, nextOffsetBuffer);
    // average samples
    const sum = x.reduce((a, b) => a + b);
    const s = Math.max(-1, Math.min(1, sum / x.length));
    // convert float32 to int16
    view[offsetResult] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  // buffer is not copied using this technique, right?
  return new Buffer(buffer);
}
