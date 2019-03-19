import * as PIXI from 'pixi.js'
import * as d3 from "d3";
import * as dat from 'dat.gui';
var TWEEN = require('@tweenjs/tween.js');
var colorutil = require('color-util');


import './styles/main.scss';
import spritesheet from './spritesheet.js';
var keysort = require('./keysort.js');



var image = function () { return PIXI.Texture.fromImage(spritesheet) }
var chartWidth = getChartWidth();
var chartHeight = 0;
var frames = [];
var stack = [];
var substack = [];
var people = [];
var peopleUnused = [];
var stackVerticalHeightTracker = 0;
var app = new PIXI.Application(chartWidth, chartHeight, { backgroundColor: 0xffffff, resolution: 2 });
var initFirst = false;
var results;


var data, config, gui;
var Config = function () {
  this.values = {};
  this.Save = function () {
    config.set(chartConfig.values);
    updateChart();
  };

  this.Reset = function () {
    buildConfigFromData();
    config.set(chartConfig.values);
    updateChart();
  };
};
var chartConfig = new Config();

function buildConfigFromData() {
  chartConfig.values.format = "Math.round(d) + '%'";
  chartConfig.values.gapBetweenOptions = 10
  chartConfig.values.personScale = 1;
  chartConfig.values.textXOffset = 5;
  chartConfig.values.xMax = 100;
  chartConfig.values.titleFontColor = "#333";
  chartConfig.values.titleFontFamily = "'Segoe UI'";
  chartConfig.values.titleFontSize = 15;
  chartConfig.values.titleFontWeight = 700;
  chartConfig.values.labelFontColor = '#343741';
  chartConfig.values.labelFontFamily = "'Segoe UI'";
  chartConfig.values.labelFontSize = 12;
  chartConfig.values.labelFontWeight = 400;
}

function setupUI() {
  if (gui) {
    gui.destroy();
  }

  //read config from powerbi settings data..
  chartConfig.values = config.get();

  //build initial set if its empty.. 
  if (!d3.keys(chartConfig.values).length) {
    buildConfigFromData();
  }

  //setup gui..
  if (config.edit) {
    gui = new dat.GUI();
    var main = gui.addFolder('Chart Settings');
    gui.add(chartConfig, 'Save');
    gui.add(chartConfig, 'Reset');

    main.add(chartConfig.values, 'format');
    main.add(chartConfig.values, 'gapBetweenOptions');
    main.add(chartConfig.values, 'personScale', 0, 3);
    main.add(chartConfig.values, 'textXOffset');
    main.add(chartConfig.values, 'xMax');
    main.addColor(chartConfig.values, 'titleFontColor');
    main.add(chartConfig.values, 'titleFontFamily');
    main.add(chartConfig.values, 'titleFontSize');
    main.add(chartConfig.values, 'titleFontWeight');
    main.addColor(chartConfig.values, 'labelFontColor');
    main.add(chartConfig.values, 'labelFontFamily');
    main.add(chartConfig.values, 'labelFontSize');
    main.add(chartConfig.values, 'labelFontWeight');

    //main.addColor(chartConfig.values, 'fixedLabelcolor');

    for (var i in gui.__folders) {
      for (var j in gui.__folders[i].__controllers) {
        if (gui.__folders[i].__controllers[j].onChange) {
          gui.__folders[i].__controllers[j].onChange(function () {
            updateChart()
          });
        }
      }
    }
  }
}


function updateChart() {
  let receivedData = d3.nest()
    .key(function (d) { return d.option; })
    .entries(data);

  //fix missing values and sorting here...
  var optionsKeysObj = {};
  var categoriesKeysObj = {};
  data.forEach(function (d, i) {
    optionsKeysObj[d.option] = d.optionsorder || i;
    categoriesKeysObj[d.category] = d.categoriesorder || i;
  });

  receivedData.forEach(function (option) {
    option.sort = +optionsKeysObj[option.key] || optionsKeysObj[option.key];
    let missingTracker = JSON.parse(JSON.stringify(categoriesKeysObj));
    option.values.forEach(function (value, i) {
      if (typeof (value.categoriesorder) === 'undefined') {
        value.categoriesorder = categoriesKeysObj[value.category]
      }
      delete missingTracker[value.category];
    })
    d3.keys(missingTracker).forEach(function (missingCategory) {
      option.values.push({
        value: null,
        category: missingCategory,
        categoriesorder: categoriesKeysObj[missingCategory]
      })
    });
    option.values = option.values.keySort({
      categoriesorder: 'asc'
    })
  });
  receivedData = receivedData.keySort({
    sort: "asc",
  })
  //console.log(receivedData, optionsKeysObj, categoriesKeysObj)
  results = receivedData;


  //////////////////////////////
  //Setup Chart
  //////////////////////////////
  if (!initFirst) {
    init();
    initFirst = true;
  } else {
    main();
  }

  //debug
  window.gui = gui;
  window.chartConfig = chartConfig;
}

function buildFunctionFromString(str) {
  var fun;
  try {
    fun = new Function("d", "return " + str + ";");
    fun(1)
  }
  catch (err) {
    console.log(err)
    fun = new Function("d", "return d;");
  }
  return fun
}

function constructPage(dataR, configR) {
  data = dataR;
  config = configR;
  setupUI();
  updateChart();
}


///////////////////
//animation stuff..
///////////////////
function setCanvasSize(w, h) {
  chartWidth = w;
  chartHeight = h;
  app.renderer.resize(chartWidth, chartHeight);
  app.view.style['width'] = chartWidth + 'px';
  app.view.style['height'] = chartHeight + 'px';
}

function init() {
  document.getElementById('app').appendChild(app.view);
  setCanvasSize(chartWidth, chartHeight);
  window.onresize = function () {
    chartWidth = getChartWidth();
    main();
  }

  var xoffsets = [624, 312, 390, 468, 546, 0, 78, 156, 234]
  frames = [];
  xoffsets.forEach(function (xo) {
    var img = image()
    var frame = new PIXI.Texture(img, new PIXI.Rectangle(xo, 0, 78, 98))
    frames.push(frame);
  })

  main();
}

function main() {
  var formFunc = buildFunctionFromString(chartConfig.values.format);
  var gapBetweenOptions = chartConfig.values.gapBetweenOptions
  var personScale = chartConfig.values.personScale;
  var textXOffset = chartConfig.values.textXOffset;
  var xMax = chartConfig.values.xMax;
  var titleFontColor = chartConfig.values.titleFontColor;
  var titleFontFamily = chartConfig.values.titleFontFamily;
  var titleFontSize = chartConfig.values.titleFontSize;
  var titleFontWeight = chartConfig.values.titleFontWeight;
  var labelFontColor = chartConfig.values.labelFontColor;
  var labelFontFamily = chartConfig.values.labelFontFamily;
  var labelFontSize = chartConfig.values.labelFontSize;
  var labelFontWeight = chartConfig.values.labelFontWeight;
  var selectionMaskArray = [];

  //loop over all options
  removeAllFromStage(stack);
  removeAllFromStage(substack);
  movePeopleToUnused();
  stack = [];
  substack = [];

  stackVerticalHeightTracker = 0;

  var background = new PIXI.Graphics();
  substack.push(background);
  app.stage.addChild(background);

  if (!results.length) {
    //Remove Unusedpeople
    removeUnusedPeople();
    return;
  }
  for (var i = 0; i < results.length; i++) {
    var d = results[i];
    var curOption = d.key;

    //add label..
    var text = prepareText(curOption, stackVerticalHeightTracker, titleFontSize, titleFontColor, titleFontWeight, textXOffset, titleFontFamily);
    stack.push(text.node);
    stackVerticalHeightTracker += text.height;
    app.stage.addChild(text.node);
    

    for (var c = 0; c < d.values.length; c++) {
      var color = [colorutil.color(d.values[c].color).rgb.r, colorutil.color(d.values[c].color).rgb.g, colorutil.color(d.values[c].color).rgb.b];
      var peopleForThisOptionActual = d.values[c].value || 0;
      var widthOfRow = chartWidth - 50;
      var widthOfPerson = 20 * personScale;
      var heightOfRow = widthOfPerson * 1.8;
      var numberOfPeoplePerRow = widthOfRow / widthOfPerson;
      var peopletopercentscale = d3.scaleLinear().domain([0, xMax]).range([0, numberOfPeoplePerRow])
      var peopleForThisOption = peopletopercentscale(peopleForThisOptionActual)
      var rowsRequiredToDisplayPeople = Math.ceil(peopleForThisOption / numberOfPeoplePerRow);
      var heightOfRegion = (heightOfRow * rowsRequiredToDisplayPeople) || heightOfRow;

      //add label for percentage..
      var text = prepareText(formFunc(peopleForThisOptionActual), 0, labelFontSize, labelFontColor, labelFontWeight, 0, labelFontFamily);
      substack.push(text.node);
      text.node.anchor.x = 0.5;
      text.node.anchor.y = 0.5;
      text.node.visible = false;
      app.stage.addChild(text.node);

      //Create people
      var colIndex = 0;
      var prevIntenralRow = 0;
      var maxXOffset = 0;
      for (var p = 0; p < peopleForThisOption; p++) {
        //Find row based on index
        var currentInternalRow = Math.ceil((p) / numberOfPeoplePerRow) - 1;
        if (currentInternalRow < 0) {
          currentInternalRow = 0;
        }
        //Row is incremented
        if (prevIntenralRow !== currentInternalRow) {
          colIndex = 1;
          prevIntenralRow = prevIntenralRow + 1;
        } else {
          colIndex = colIndex + 1;
        }


        var curXOffset = (colIndex * widthOfPerson) - widthOfPerson / 2;
        if (maxXOffset < curXOffset) {
          maxXOffset = curXOffset;
        }
        var yDestination = stackVerticalHeightTracker + (currentInternalRow * heightOfRow) + heightOfRow / 2;
        var person = provisionPerson(1, curXOffset, yDestination, personScale);
        walkPerson(person, curXOffset, yDestination);
        changeColor(person, color);
      }
      text.node.x = maxXOffset + widthOfPerson + 10;
      text.node.y = stackVerticalHeightTracker + (heightOfRegion / 2);

      //clickable area 
      var selectionMask = new PIXI.Graphics();
      selectionMask.lineStyle(0, 0x000000, 0);
      selectionMask.beginFill(0xffffff, 0.8);
      selectionMask.drawRoundedRect(0, stackVerticalHeightTracker, maxXOffset + widthOfPerson / 2 + 50, heightOfRegion, 0);
      selectionMask.endFill();
      selectionMask.interactive = true;
      selectionMask.buttonMode = true;
      selectionMask.selectionId = d.values[c].selectionId;
      selectionMask.alpha = 0;
      selectionMask.show = function () {
        this.alpha = 0;
      }
      selectionMask.hide = function () {
        this.alpha = 1;
      }
      selectionMask.on('click', function (event) {
        config.customClickHandler(event, this);
      });
      substack.push(selectionMask);
      selectionMaskArray.push(selectionMask);
      app.stage.addChild(selectionMask);

      stackVerticalHeightTracker += heightOfRegion;
    }
    stackVerticalHeightTracker += gapBetweenOptions;
  }
  //background
  background.lineStyle(0, 0x000000, 0);
  background.beginFill(0x000000, 0);
  background.drawRoundedRect(0, 0, chartWidth, stackVerticalHeightTracker, 0);
  background.endFill();
  background.interactive = true;
  background.buttonMode = false;
  background.alpha = 1;
  background.on('click', function (event) {
    config.customClickHandler(event);
  });

  config.manageMySelections(selectionMaskArray);

  setTimeout(function () {
    substack.forEach(function (d) { d.visible = true })
  }, 2200)

  //Remove Unusedpeople
  removeUnusedPeople();

  //Resize Canvas now...
  setCanvasSize(chartWidth, stackVerticalHeightTracker)


  // Animate 
  app.ticker.add(function (t) {
    TWEEN.update();
  });
}

function getChartWidth() {
  var w = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
  return w - 8;
}

function walkPerson(person, x, y) {
  var startX = person.x;
  var startY = person.y;
  var timeToTravel = Math.abs(startX - x) / 14 * getRandomArbitrary(100, 250);
  if (timeToTravel > 3000) {
    timeToTravel = 3000;
  }
  stopSprit(person)
  if (person.tween_walk) {
    TWEEN.remove(person.tween_walk)
  }
  var tw = new TWEEN.Tween({
    x: startX,
    y: startY
  })
    .to({
      x: x,
      y: y
    }, timeToTravel)
    .onUpdate(function () {
      person.x = this._object.x;
      person.y = this._object.y;
    })
    //.interpolation( TWEEN.Interpolation.Bezier )
    .interpolation(function tenStepEasing(k) {
      return Math.floor(k * 10) / 10;
    })
  person.tween_walk = tw;
  if (startX < x) {
    moveRight(person);
  } else if (startX > x) {
    moveLeft(person);
  }
  tw.start();
  tw.onComplete(function () {
    stopSprit(person);
  });
}

function removeUnusedPeople() {
  var pep;
  while (pep = peopleUnused.pop()) {
    app.stage.removeChild(pep);
  }
}

function movePeopleToUnused() {
  var pep;
  while (pep = people.pop()) {
    peopleUnused.push(pep);
  }
}

function getPersonFromArray(n, x, y) {
  var personsTemp = peopleUnused.filter(function (d, i) {
    d.ind = i;
    if (d.question == n && d.qY == y) {
      return true;
    }
  })
  var person;
  if (personsTemp.length) {
    person = personsTemp.pop();
    peopleUnused.splice(person.ind, 1)
  } else {
    person = peopleUnused.pop();
  }
  return person;
}

function provisionPerson(n, newX, newY, personScale) {
  //var person = peopleUnused.pop();
  //TBD choose the right person rather than the last one in array..
  var person = getPersonFromArray(n, newX, newY);
  if (typeof person === 'undefined') {
    person = new PIXI.extras.AnimatedSprite(frames);
    setPropsForAnim(person, personScale);
    people.push(person);
    app.stage.addChild(person);
    person.question = n
    person.qX = newX
    person.qY = newY

    //for no ghosting..
    if (1) {
      person.x = getRandomArbitrary(newX - 300, newX + 300)
      person.y = getRandomArbitrary(newY - 300, newY + 300)
    }
  } else {

    person.width = (312 / 18 * 1.62) * personScale;
    person.height = (390 / 18 * 1.62) * personScale;
    if (person.question == n) {
      people.push(person);
    } else {
      //person.x = getRandomArbitrary(0, -50);
      //person.y = getRandomArbitrary(0, 20);
      people.push(person);
      person.question = n;
    }
    person.qX = newX
    person.qY = newY
  }


  return person;
}

function removeAllFromStage(ar) {
  for (var i = 0; i < ar.length; i++) {
    var elm = ar[i];
    app.stage.removeChild(elm);
    elm.destroy({ children: true, texture: true, baseTexture: true });
  }
}

function prepareText(text, stackHeight, size, color, weight, textXOffset, fontFamily) {
  var textNode = new PIXI.Text(text, {
    fontSize: size ? size : 16,
    fontWeight: weight ? weight : 400,
    fontFamily: fontFamily,
    fill: color || '#5f6369',
    align: 'left',
    wordWrapWidth: chartWidth - 24,
    wordWrap: true,
    strokeThickness: 0
  });
  textNode.x = textXOffset || 0;
  textNode.y = stackHeight;
  textNode.resolution = 2;
  return {
    node: textNode,
    height: textNode.height
  };
}

function moveRight(anim) {
  anim.state = "right";
  anim.playSequence([1, 4]);
}

function moveLeft(anim) {
  anim.state = "left";
  anim.playSequence([5, 8]);
}

function stopSprit(anim) {
  anim.state = "stop";
  anim.show(0);
}

function changeColor(anim, c) {
  var matrix = anim.filters[0].matrix;

  var currentR = matrix[3];
  var currentG = matrix[8];
  var currentB = matrix[13];

  var destinationR = c[0] / 255;
  var destinationG = c[1] / 255;
  var destinationB = c[2] / 255;

  if (anim.tween_color) {
    TWEEN.remove(anim.tween_color)
  }

  var tw = new TWEEN.Tween({
    r: currentR,
    g: currentG,
    b: currentB,
  })
    .to({
      r: destinationR,
      g: destinationG,
      b: destinationB,
    }, 1500)
    .onUpdate(function () {
      matrix[3] = this._object.r;
      matrix[8] = this._object.g;
      matrix[13] = this._object.b;
    })
    .interpolation(TWEEN.Interpolation.Bezier)
    .start();

  anim.tween_color = tw;
}

function setPropsForAnim(anim, personScale) {
  //anim.x = getRandomArbitrary(0, chartWidth);
  //anim.y = getRandomArbitrary(0, chartHeight);
  anim.x = getRandomArbitrary(0, -50);
  anim.y = getRandomArbitrary(0, 20);
  anim.anchor.set(0.5);
  anim.width = (312 / 18 * 1.62) * personScale;
  anim.height = (390 / 18 * 1.62) * personScale;
  addStatePlayer(anim);
  anim.fps = 4;

  var filter = new PIXI.filters.ColorMatrixFilter();
  filter.resolution = 2;
  filter.matrix[3] = 1;
  filter.matrix[8] = 1;
  filter.matrix[13] = 1;
  anim.filters = [filter];
}

function getRandomArbitrary(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

function addStatePlayer(sprite) {
  //Make sure the sprite is a Pixi MovieClip
  if (!(sprite instanceof PIXI.extras.AnimatedSprite)) {
    throw new Error("You can only animate PIXI.MovieClip sprites");
    return;
  }

  //Intialize the variables
  var frameCounter = 0,
    numberOfFrames = 0,
    startFrame = 0,
    endFrame = 0,
    timerInterval = undefined,
    playing = false;

  //The `show` function (to display static states)
  function show(frameNumber) {
    //Reset any possible previous animations
    reset();
    //Find the new state on the sprite 
    sprite.gotoAndStop(frameNumber);
  };

  //The `playSequence` function, to play a sequence of frames
  function playSequence(sequenceArray) {
    //Reset any possible previous animations
    reset();
    //Figure out how many frames there are in the range
    startFrame = sequenceArray[0];
    endFrame = sequenceArray[1];
    numberOfFrames = endFrame - startFrame;
    //Calculate the frame rate. Set a default fps of 12
    if (!sprite.fps) sprite.fps = 12;
    var frameRate = 1000 / sprite.fps;
    //Set the sprite to the starting frame
    sprite.gotoAndStop(startFrame);
    //If the state isn't already playing, start it
    if (!playing) {
      timerInterval = setInterval(advanceFrame.bind(this), frameRate);
      playing = true;
    }
  };

  //`advanceFrame` is called by `setInterval` to dislay the next frame
  //in the sequence based on the `frameRate`. When frame sequence
  //reaches the end, it will either stop it or loop it.
  function advanceFrame() {
    //Advance the frame if `frameCounter` is less than 
    //the state's total frames
    if (frameCounter < numberOfFrames) {
      //Advance the frame
      sprite.gotoAndStop(sprite.currentFrame + 1);
      //Update the frame counter
      frameCounter += 1;
    } else {
      //If we've reached the last frame and `loop`
      //is `true`, then start from the first frame again
      if (sprite.loop) {
        sprite.gotoAndStop(startFrame);
        frameCounter = 1;
      }
    }
  }

  function reset() {
    //Reset `playing` to `false`, set the `frameCounter` to 0,
    //and clear the `timerInterval`
    if (timerInterval !== undefined && playing === true) {
      playing = false;
      frameCounter = 0;
      startFrame = 0;
      endFrame = 0;
      numberOfFrames = 0;
      clearInterval(timerInterval);
    }
  }

  //Add the `show` and `playSequence` methods to the sprite
  sprite.show = show;
  sprite.playSequence = playSequence;
}

window.constructPage = constructPage;