const {ipcRenderer, shell} = require('electron')
var isElectronApp = window.process.type == "renderer" ? true : false;
// var isElectronApp = false;

var answers = [];
var nlp;
var minDuration = 1;
var maxDuration = 2;

$(document).ready(function() {
  nlp = window.nlp;
  $.getJSON("./config.json")
  .done(function(data){
    for (var i = 0; i < data.themes.length; i++) {
      var theme = data.themes[i];
      for (var j = 0; j < theme.answers.length; j++) {
        var answer = theme.answers[j];
        var newAnswer = {};
        newAnswer.id = i+j;
        newAnswer.theme = theme.name;
        newAnswer.answer = answer.answer;
        newAnswer.keywords = [answer.keyword].concat(answer.synonyms);
        answers.push(newAnswer);
      }
    }

    $("#search-question").focus();

    $("#search-form").submit(function() {
      event.preventDefault();
      searchAnswer();
    });

    $("#new-question").click(function() {
      resetForm();
    });
  });
});

function searchAnswer() {
  var question = $("#search-question").val();
  $("#search-question").val("");
  var isQuestion = nlp(question).questions().data()

  if (isQuestion.length > 0) {
    var nouns = nlp(question).nouns().out('array');
    var adjectives = nlp(question).adjectives().out('array');
    var keywords = nouns.concat(adjectives);
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
  $("#answer-section").fadeOut(200);
  $("#question-section").delay(100).fadeIn(200, function() {
    $("#search-question").focus();
  });
  if (isElectronApp) {
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
  let notification = new Notification('Mary answered your question', {
    body: answer.answer
  });

  notification.onclick = () => {
    ipcRenderer.send('show-window')
  }
}

function showAnswer(answers) {
  console.log(answers);
  var answer = answers[Math.floor(Math.random() * answers.length)];
  $("#answer-text").html(answer.answer);
  $("#progress-bar").attr('value', 0);
  var duration = getRandomDuration(minDuration, maxDuration);

  $("#question-section").fadeOut(200);
  $("#progress-section").delay(100).fadeIn(200);

  if (isElectronApp) {
    setTimeout(function() {
      showNotification(answer);
    }, duration+250);
    ipcRenderer.send('resize-window', 215)
  }

  $({ n: 0 }).animate({ n: 100}, {
    duration: duration,
    step: function(now, fx) {
      $("#progress-bar").attr('value', now);
      if (now == 100) {
        $("#progress-section").delay(100).fadeOut(200);
        $("#answer-section").delay(200).fadeIn(200);
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
