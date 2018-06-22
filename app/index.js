var ipcRenderer = null;
var shell = null;
var remote = null;
var drag = null;
var droppable = null;
var addon = null;

var AppType = {
  TRAY: "tray",
  KIOSK: "kiosk",
  WEB: "web"
}

var EnvType = {
  PROD: "prod",
  DEBUG: "debug"
}

var AppEnv = {};

var answers = [];
var nlp;
var minDuration = 10;
var maxDuration = 30;
var videoInterval = 2000;
var videoIsPlaying = false;

var playerInterval;

function handleDragDrop() {
  var holder = document.getElementById('main-content');

  holder.ondragover = () => {
    return false;
  };

  holder.ondragleave = () => {
    return false;
  };

  holder.ondragend = () => {
    return false;
  };

  holder.ondrop = (ev) => {
    ev.preventDefault();


    if (ev.dataTransfer.items) {
      // Use DataTransferItemList interface to access the file(s)
      for (var i = 0; i < ev.dataTransfer.items.length; i++) {
        // If dropped items aren't files, reject them
        if (ev.dataTransfer.items[i].kind === 'file') {
          var file = ev.dataTransfer.items[i].getAsFile();
          if (file.name === "config.json") {
            console.log('loading new config file');
            var reader = new FileReader();
            reader.onloadend = function (e) {
              var result = JSON.parse(this.result);
              parseJSON(result);
            };
            reader.readAsText(file);
          }
        }
      }
    } else {
      // Use DataTransfer interface to access the file(s)
      for (var i = 0; i < ev.dataTransfer.files.length; i++) {
        if (ev.dataTransfer.files[i].name === "config.json") {
          console.log('loading new config file');
        }
      }
    }

    // for (let f of e.dataTransfer.files) {
    //   if (f.path.endsWith("config.json")) {
    //     console.log('loading new config file');
    //     console.log(f.getData("text/plain"));
    //   }
    // }

    return false;
  };
}

function playVideo() {
  videoIsPlaying = true;
  window.clearInterval(playerInterval);
  var videoPlayer = $("video").get(0);
  var promise = videoPlayer.play(0);
  if (promise !== undefined) {
    promise.catch(error => {
      // Auto-play was prevented
      // Show a UI element to let the user manually start playback
    }).then(() => {
      videoPlayer.addEventListener('ended', function () {
        videoIsPlaying = false;
      });
    });
  }  
}

$(document).ready(function() {
  nlp = window.nlp;

  $.getJSON("./assets/env.json")
  .done(function (data) {
    AppEnv = data;
    
    minDuration = AppEnv.minDuration,
    maxDuration = AppEnv.maxDuration;
    videoInterval = AppEnv.interval*1000;

    if (AppEnv.env === EnvType.DEBUG) {
      minDuration = 1;
      maxDuration = 3;
      videoInterval = 10000;
      handleDragDrop();
    }

    if (!isMobile.phone && window.matchMedia("(min-width: 768px)").matches) {

      console.log("we are on desktop, add event listeners");

      playerInterval = window.setInterval(playVideo, videoInterval);

      window.addEventListener("mousemove", function () {
        window.clearInterval(playerInterval);
        if (!videoIsPlaying) {
          playerInterval = window.setInterval(playVideo, videoInterval);
        }
      });

      window.addEventListener("keydown", function () {
        window.clearInterval(playerInterval);
        if (!videoIsPlaying) {
          playerInterval = window.setInterval(playVideo, videoInterval);
        }
      });
    };

    resetForm();

    if (AppEnv.type !== AppType.WEB) {
      ipcRenderer = require('electron').ipcRenderer;
      shell = require('electron').shell;
      remote = require('electron').remote;
      parseJSON(remote.getGlobal('configJSON'));
    } else {      
      $.getJSON("./assets/config.json")
      .done(function (data) {
        parseJSON(data);
      });
    }
  });
});

function parseJSON(data) {
  if (data === undefined) {
    console.log("error no data");
  } else {
    console.log("config.json version "+data.version);
    for (var i = 0; i < data.themes.length; i++) {
      var theme = data.themes[i];
      for (var j = 0; j < theme.answers.length; j++) {
        var answer = theme.answers[j];
        var newAnswer = {};
        newAnswer.id = i + j;
        newAnswer.theme = theme.name;
        newAnswer.answer = answer.answer;
        newAnswer.keywords = [answer.keyword].concat(answer.synonyms);
        answers.push(newAnswer);
      }
    }

    $("#search-question").focus();

    $("#search-form").submit(function () {
      event.preventDefault();
      searchAnswer();
    });

    $("#new-question").click(function () {
      resetForm();
    });
  }  
}

function searchAnswer() {
  var question = $("#search-question").val();
  $("#search-question").val("");
  var isQuestion = nlp(question).questions().data()

  if (isQuestion.length > 0) {
    var nouns = nlp(question).nouns().out('array');
    var adjectives = nlp(question).adjectives().out('array');

    var tags = nlp(question).out('tags');
    var prepositions = [];
    for (var i = 0; i<tags.length; i++) {
      var t = tags[i];
      if (t.tags.includes("Preposition")) {
        prepositions.push(t.normal);
      };
    }

    var keywords = nouns.concat(adjectives);
    keywords = keywords.concat(prepositions);
    var possibleAnswers = [];
    for (var i = 0; i < answers.length; i++) {
      var a = answers[i];
      if (isValidAnswer(a,keywords)) {
        possibleAnswers.push(a);
      }
    }
    if (possibleAnswers.length > 0) {
      showAnswer(possibleAnswers);
    }
  }
}

function resetForm() {
  $("#new-question").get(0).disabled = true;
  $("#answer-section").fadeTo(200, 0);
  $("#progress-section").fadeOut(200);
  $("#video-mobile").delay(100).animate({ paddingTop: '55px' }, 200);
  $("#question-section").delay(350).fadeIn(200, function() {
    $("#search-question").focus();
  });
  if (AppEnv.type === AppType.TRAY) {
    setTimeout(function() {
      ipcRenderer.send('reset-window')
    }, 100);
  }
}

function showNotification(answer) {
  answer.title = "*";
  var windowHeight = $("#new-question").offset().top + $("#new-question").outerHeight()+24;
  ipcRenderer.send('answer-received', answer)
  ipcRenderer.send('resize-window', windowHeight)
  /*let notification = new Notification('Mary answered your question', {
    body: answer.answer
  });

  notification.onclick = () => {
    ipcRenderer.send('show-window')
  }*/
}

function showAnswer(answers) {
  var answer = answers[Math.floor(Math.random() * answers.length)];
  $("#answer-text").html(answer.answer);
  $("#progress-bar").attr('value', 0);
  var duration = getRandomDuration(minDuration, maxDuration);
  $("#question-section").fadeOut(200);

  $("#progress-section").delay(250).fadeIn(200);

  if (AppEnv.type !== AppType.WEB) {
    setTimeout(function() {
      showNotification(answer);
    }, duration+250);
    if (AppEnv.type === AppType.TRAY) {
      ipcRenderer.send('resize-window', 215)
    }    
  }

  var margin = $("#answer-text").outerHeight() + $("#answer-button").outerHeight() + 30;

  $({ n: 0 }).animate({ n: 100}, {
    duration: duration,
    step: function(now, fx) {
      $("#progress-bar").attr('value', now);
      if (now == 100) {
        $("#new-question").get(0).disabled = false;
        $("#progress-section").delay(100).fadeOut(200);
        $("#answer-section").delay(350).fadeTo(200, 1);
        $("#video-mobile").animate({ paddingTop: margin + 'px' }, 200);     
      }
    }
  });
}

function isValidAnswer(answer, keywords) {
  var ret = [];
  for(var i in answer.keywords) {
    if(keywords.indexOf(answer.keywords[i]) > -1){
      ret.push(answer);
    }
  }
  return ret.length > 0 ? true : false;
}

function getRandomDuration(min, max) {
  min = min*1000;
  max = max*1000;
  return Math.round(Math.random() * (max - min) + min);
}

// let voice = undefined

// const speakTheGoodNews = (weather) => {
  // const summary = weather.currently.summary.toLowerCase()
  // const feelsLike = Math.round(weather.currently.apparentTemperature)
  // const utterance = new SpeechSynthesisUtterance(`Go outside! The weather is ${summary} and feels like ${feelsLike} degrees.`)
  // utterance.voice = voice
  // speechSynthesis.speak(utterance)
// }

// speechSynthesis.onvoiceschanged = () => {
//   voice = speechSynthesis.getVoices().find((voice) => voice.name === 'Good News')
// }
