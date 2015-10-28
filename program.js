// fork getUserMedia for multiple browser versions, for those
// that need prefixes

navigator.getUserMedia = (navigator.getUserMedia ||
                          navigator.webkitGetUserMedia ||
                          navigator.mozGetUserMedia ||
                          navigator.msGetUserMedia);

// set up forked web audio context, for multiple browsers
// window. is needed otherwise Safari explodes

var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
var voiceSelect = document.getElementById("voice");
var source;
var stream;

// grab the mute button to use below

var mute = document.querySelector('.mute');

//set up the different audio nodes we will use for the app

var analyser = audioCtx.createAnalyser();
analyser.minDecibels = -90;
analyser.maxDecibels = -10;
analyser.smoothingTimeConstant = 0.85;

var distortion = audioCtx.createWaveShaper();
var gainNode = audioCtx.createGain();
var biquadFilter = audioCtx.createBiquadFilter();
var convolver = audioCtx.createConvolver();

// distortion curve for the waveshaper, thanks to Kevin Ennis
// http://stackoverflow.com/questions/22312841/waveshaper-node-in-webaudio-how-to-emulate-distortion

function makeDistortionCurve(amount) {
  var k = typeof amount === 'number' ? amount : 50,
    n_samples = 44100,
    curve = new Float32Array(n_samples),
    deg = Math.PI / 180,
    i = 0,
    x;
  for ( ; i < n_samples; ++i ) {
    x = i * 2 / n_samples - 1;
    curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) );
  }
  return curve;
};

// grab audio track via XHR for convolver node

// set up canvas context for visualizer


var tuner = new Tuner(document.querySelector('.tuner'));

var canvas = document.querySelector('.visualizer');
var canvasCtx = canvas.getContext("2d");

var intendedWidth = document.querySelector('.wrapper').clientWidth;

canvas.setAttribute('width',intendedWidth);

var visualSelect = document.getElementById("visual");

var drawVisual;

analyser.fftSize = 1024;
var bufferLength = analyser.frequencyBinCount;
console.log(bufferLength);
var dataArray = new Float32Array(bufferLength);


//main block for doing the audio recording

if (navigator.getUserMedia) {
   console.log('getUserMedia supported.');
   navigator.getUserMedia (
      // constraints - only audio needed for this app
      {
         audio: true
      },

      // Success callback
      function(stream) {
         source = audioCtx.createMediaStreamSource(stream);
         source.connect(analyser);
         analyser.connect(distortion);
         distortion.connect(biquadFilter);
         biquadFilter.connect(convolver);
         convolver.connect(gainNode);
         gainNode.connect(audioCtx.destination);
         voiceChange();
      	 visualize();

		     //console.debug(getFrequencies());

      },

      // Error callback
      function(err) {
         console.log('The following gUM error occured: ' + err);
      }
   );
} else {
   console.log('getUserMedia not supported on your browser!');
}


function visualize() {
  console.log("VISUALIZE");
  WIDTH = canvas.width;
  HEIGHT = canvas.height;


  var visualSetting = "frequencybars";
  console.log(visualSetting);

  if(visualSetting == "frequencybars") {


    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

    function draw() {
      drawVisual = requestAnimationFrame(draw);
      analyser.getFloatFrequencyData(dataArray);

      requestAnimationFrame(function(){
        tuner.tune(getFrequencies());
        tuner.draw();
      });

      canvasCtx.fillStyle = 'rgb(0, 0, 0)';
      canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

      var barWidth = (WIDTH / bufferLength) * 2.5;
      var barHeight;
      var x = 0;

      for(var i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] + 140)*2;

        canvasCtx.fillStyle = 'rgb(' + Math.floor(barHeight+100) + ',50,50)';
        canvasCtx.fillRect(x,HEIGHT-barHeight/2,barWidth,barHeight/2);

        x += barWidth + 1;
      }
    };

    draw();

  } else if(visualSetting == "off") {
    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
    canvasCtx.fillStyle = "red";
    canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
  }

}


function getFrequencyValue(frequency, data) {
  var nyquist = audioCtx.sampleRate/2;
  var index = Math.round(frequency/nyquist * data.length);
  return (data[index]+140)*2;
}

function getToneFrequencies(){
	//analyser.fftSize = 256;
    //var bufferLength = analyser.frequencyBinCount;
    //console.log(bufferLength);
    //var dataArray = new Float32Array(bufferLength);
    //analyser.getFloatFrequencyData(dataArray);
	var relevantTones = ["c", "d", "e", "f", "g", "a", "h"];
	var relevantFrequencies = [523, 587, 659, 698, 784, 880, 987];
	var freqData = [];
	for(var i=0; i < relevantFrequencies.length; i++){
		freqData.push({"tone": relevantTones[i], "value":getFrequencyValue(relevantFrequencies[i], dataArray)});
	}
	freqData.sort(function(a,b){return b.value-a.value;});
	return freqData;
}

function getFrequencies(max){
  var max = max || 2500;
	var freqData = [];
	for(var i=0; i < max; i++){
		freqData.push({"frequency": i, "value":getFrequencyValue(i, dataArray)});
	}
	freqData.sort(function(a,b){return b.value-a.value;});
	return freqData;
}



function printNote(){
	var node = document.getElementById("bestNote");
	node.innerHTML = getToneFrequencies()[0].tone;
	requestAnimationFrame(printNote);
}

function voiceChange() {
  distortion.curve = new Float32Array;
  distortion.oversample = '4x';
  biquadFilter.gain.value = 0;
  convolver.buffer = undefined;

  var voiceSetting = "off";
  console.log(voiceSetting);

  if(voiceSetting == "distortion") {
    distortion.curve = makeDistortionCurve(400);
  } else if(voiceSetting == "convolver") {
    convolver.buffer = concertHallBuffer;
  } else if(voiceSetting == "biquad") {
    biquadFilter.type = "lowshelf";
    biquadFilter.frequency.value = 1000;
    biquadFilter.gain.value = 25;
  } else if(voiceSetting == "off") {
    console.log("Voice settings turned off");
  }

}
