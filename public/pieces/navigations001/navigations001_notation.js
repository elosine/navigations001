//#ef NOTES
/*


*/
//#endef NOTES

//#ef General Variables
const TEMPO_COLORS = [clr_limeGreen, clr_mustard, clr_brightBlue, clr_brightOrange, clr_lavander, clr_darkRed2, clr_brightGreen, clr_lightGrey, clr_neonMagenta, clr_plum, clr_blueGrey, clr_lightGrey, clr_lightGreen];
//Timing
const LEADIN_SEC = 0;
const FRAMERATE = 60;
let FRAMECOUNT = -LEADIN_SEC * FRAMERATE;
const MS_PER_FRAME = 1000.0 / FRAMERATE;
let animationIsGo = true;
//Timesync
const TS = timesync.create({
  server: '/timesync',
  interval: 1000
});
//#endef General Variables

//#ef INIT
function init() {
  makeTempiPanel();
  calcTempiScrollingCursor();
  drawTempiBeatLines();
  makeTempiScrollingCursors();
  tempi_makeBbs();

  let ts_Date = new Date(TS.now());
  let tsNowEpochTime_MS = ts_Date.getTime();
  epochTimeOfLastFrame_MS = tsNowEpochTime_MS;
  requestAnimationFrame(animationEngine);
}
//#endef INIT

//#ef Animation Engine
let cumulativeChangeBtwnFrames_MS = 0;
let epochTimeOfLastFrame_MS;

function animationEngine(timestamp) {
  let ts_Date = new Date(TS.now());
  let tsNowEpochTime_MS = ts_Date.getTime();
  cumulativeChangeBtwnFrames_MS += tsNowEpochTime_MS - epochTimeOfLastFrame_MS;
  epochTimeOfLastFrame_MS = tsNowEpochTime_MS;
  while (cumulativeChangeBtwnFrames_MS >= MS_PER_FRAME) {
    if (cumulativeChangeBtwnFrames_MS > (MS_PER_FRAME * FRAMERATE)) cumulativeChangeBtwnFrames_MS = MS_PER_FRAME;
    update();
    FRAMECOUNT++;
    cumulativeChangeBtwnFrames_MS -= MS_PER_FRAME;
  }
  if (animationIsGo) {
    requestAnimationFrame(animationEngine);
  }
}

function update() {
  if (FRAMECOUNT >= 0) {
    tempi_updateScrollingCsrs();
    tempi_updateBbs();
  }
}
//#endef Animation Engine

//#ef Tempi
/*
 */
let tempiTempos = [
  [60, 60, ''],
  [83, 83, ''],
  [19, 180, 'a'],
  [200, 23, 'd']
];
//Tempi Panel
let tempiPanel = {};
tempiPanel['title'] = "Tempi";
let tempiCanvasClr = 'black';
let tempiPanel_H = 160;
let tempiPanel_W = 912;

function makeTempiPanel() {
  let tPanel = mkPanel({
    w: tempiPanel_W,
    h: tempiPanel_H,
    title: tempiPanel.title,
    onwindowresize: true,
    clr: 'none',
    ipos: 'center-top',
  });
  tempiPanel['panel'] = tPanel;
  tempiPanel['div'] = tPanel.content;
  let tSvg = mkSVGcontainer({
    canvas: tPanel.content,
    w: tempiPanel_W,
    h: tempiPanel_H,
    x: 0,
    y: 0,
  });
  tSvg.style.backgroundColor = tempiCanvasClr;
  tempiPanel['svg'] = tSvg;
}

const TEMPI_GAP_BTWN_NOTATION_LINES = 2;
const TEMPI_NUM_NOTATION_LINES = tempiTempos.length;
const TEMPI_NOTATION_H = (tempiPanel_H / TEMPI_NUM_NOTATION_LINES) - TEMPI_GAP_BTWN_NOTATION_LINES;
// const TEMPI_NOTATION_H = (tempiPanel_H / TEMPI_NUM_NOTATION_LINES) - (TEMPI_GAP_BTWN_NOTATION_LINES*(TEMPI_NUM_NOTATION_LINES-1));
const TEMPI_VERT_DISTANCE_BETWEEN_LINES = TEMPI_NOTATION_H + TEMPI_GAP_BTWN_NOTATION_LINES;
const TEMPI_PX_PER_BEAT = 57; //tempiPanel_W needs to be divisible by whole number of beats
const TEMPI_BEATS_PER_LINE = 16;
const TEMPI_NOTATION_LINE_LENGTH_PX = TEMPI_BEATS_PER_LINE * TEMPI_PX_PER_BEAT;
let tempiScrollingCursors = [];
let tempiScrCsrText = [];
let tempiScrollingCsrY1 = 0;
let tempiScrollingCsrH = TEMPI_NOTATION_H;
let scrollingCsrClrs = [];
let tempiLineY = [];
let tempiTotalNumFramesPerTempo = [];
let tempiTempoConsts = [];
tempiTempos.forEach((tempoArr, i) => {
  let td = {};
  //convert initial and final tempi from bpm to pixelsPerFrame
  let iTempo = tempoArr[0]; //bpm
  let fTempo = tempoArr[1]; //bpm
  td['iTempoBPM'] = iTempo;
  td['fTempoBPM'] = fTempo;
  // convert bpm to pxPerFrame: pxPerMinute = iTempo * PX_PER_BEAT; pxPerSec = pxPerMinute/60; pxPerFrame = pxPerSec/FRAMERATE
  let iTempoPxPerFrame = ((iTempo * TEMPI_PX_PER_BEAT) / 60) / FRAMERATE;
  let fTempoPxPerFrame = ((fTempo * TEMPI_PX_PER_BEAT) / 60) / FRAMERATE;
  td['iTempoPxPerFrame'] = iTempoPxPerFrame;
  td['fTempoPxPerFrame'] = fTempoPxPerFrame;
  //calc acceleration from initial tempo and final tempo
  // a = (v2 - u2) / 2s ; v=finalVelocity, u=initialVelocity, s=totalDistance
  let tAccel = (Math.pow(fTempoPxPerFrame, 2) - Math.pow(iTempoPxPerFrame, 2)) / (2 * TEMPI_NOTATION_LINE_LENGTH_PX);
  td['accel'] = tAccel;
  // Calculate total number of frames from acceleration and distance
  // t = sqrRoot( (2L/a) ) ; L is total pixels
  let totalDurFrames;
  if (tAccel == 0) {
    totalDurFrames = Math.round(TEMPI_NOTATION_LINE_LENGTH_PX / iTempoPxPerFrame);
  } else {
    totalDurFrames = Math.round((fTempoPxPerFrame - iTempoPxPerFrame) / tAccel);
  }
  td['totalDurFrames'] = totalDurFrames;
  tempiTempoConsts.push(td);
});
//calc tempo Y location
for (var i = 0; i < tempiTempos.length; i++) {
  let ty = tempiScrollingCsrY1 + ((TEMPI_NOTATION_H + TEMPI_GAP_BTWN_NOTATION_LINES) * i);
  tempiLineY.push(ty);
}
//cursor colors
tempiTempos.forEach((tempo, tix) => {
  scrollingCsrClrs.push(TEMPO_COLORS[tix % TEMPO_COLORS.length]);
});

function calcTempiScrollingCursor() {
  tempiTempoConsts.forEach((tempoObj, tempoIx) => { //run for each tempo
    let frameArray = [];
    let tNumFrames = Math.round(tempoObj.totalDurFrames); //create an array with and index for each frame in the piece per tempo
    for (var frmIx = 0; frmIx < tNumFrames; frmIx++) { //loop for each frame in the piece
      let td = {}; //dictionary to hold position values
      //Calculate x
      let tCurPx = Math.round((tempoObj.iTempoPxPerFrame * frmIx) + ((tempoObj.accel * Math.pow(frmIx, 2)) / 2));
      td['absX'] = tCurPx;
      let tx = tCurPx % TEMPI_NOTATION_LINE_LENGTH_PX; //calculate cursor x location at each frame for this tempo
      td['x'] = tx;
      //Calc Y pos
      td['y'] = tempiLineY[tempoIx];
      frameArray.push(td);
    }
    tempiTempoConsts[tempoIx]['frameArray'] = frameArray;
    tempiTotalNumFramesPerTempo.push(frameArray.length);
  });
}

function makeTempiScrollingCursors() {
  for (var i = 0; i < tempiTempos.length; i++) {
    let tCsr = mkSvgLine({
      svgContainer: tempiPanel.svg,
      x1: 0,
      y1: tempiScrollingCsrY1,
      x2: 0,
      y2: tempiScrollingCsrY1 + tempiScrollingCsrH,
      stroke: scrollingCsrClrs[i],
      strokeW: 2
    });
    tCsr.setAttributeNS(null, 'stroke-linecap', 'round');
    tCsr.setAttributeNS(null, 'display', 'yes');
    tempiScrollingCursors.push(tCsr);
    //Cursor Text
    let tTxt = mkSvgText({
      svgContainer: tempiPanel.svg,
      x: -19,
      y: tempiScrollingCsrY1 + 11,
      fill: scrollingCsrClrs[i],
      stroke: scrollingCsrClrs[i],
      strokeW: 1,
      justifyH: 'start',
      justifyV: 'auto',
      fontSz: 14,
      fontFamily: 'lato',
      txt: tempiTempos[i][2]
    });
    tempiScrCsrText.push(tTxt);
  }
}

function tempi_updateScrollingCsrs(frame, tempoIx) {
  tempiTotalNumFramesPerTempo.forEach((numFrames, tempoIx) => {
    let currFrame = FRAMECOUNT % numFrames;
    let tx = tempiTempoConsts[tempoIx].frameArray[currFrame].x;
    let ty = tempiTempoConsts[tempoIx].frameArray[currFrame].y;
    tempiScrollingCursors[tempoIx].setAttributeNS(null, 'x1', tx);
    tempiScrollingCursors[tempoIx].setAttributeNS(null, 'x2', tx);
    tempiScrollingCursors[tempoIx].setAttributeNS(null, 'y1', ty);
    tempiScrollingCursors[tempoIx].setAttributeNS(null, 'y2', ty + tempiScrollingCsrH);
    tempiScrCsrText[tempoIx].setAttributeNS(null, 'x', tx - 12);
    tempiScrCsrText[tempoIx].setAttributeNS(null, 'y', ty + 11);
  });
}

// Scrolling Cursor BBs
let TEMPI_BB_RADIUS = 4;
let tempi_bbs = [];
// Calculate Ascent and Descent for 1 BB
let tempi_bbOneBeat = [];
// let descentPct = 0.6;
let tempi_descentPct = 0.8;
let tempi_ascentPct = 1 - tempi_descentPct;
let tempi_ascentNumXpx = Math.ceil(tempi_ascentPct * TEMPI_PX_PER_BEAT);
let tempi_descentNumXpx = Math.floor(tempi_descentPct * TEMPI_PX_PER_BEAT);
let tempi_ascentFactor = 0.15;
let tempi_descentFactor = 5;
let tempi_ascentPlot = plot(function(x) { //see Function library; exponential curve
  return Math.pow(x, tempi_ascentFactor);
}, [0, 1, 0, 1], tempi_ascentNumXpx, tempiScrollingCsrH, tempiScrollingCsrY1);
tempi_ascentPlot.forEach((y) => {
  tempi_bbOneBeat.push(y);
});
let tempi_descentPlot = plot(function(x) {
  return Math.pow(x, tempi_descentFactor);
}, [0, 1, 1, 0], tempi_descentNumXpx, tempiScrollingCsrH, tempiScrollingCsrY1);
tempi_descentPlot.forEach((y) => {
  tempi_bbOneBeat.push(y);
});

function tempi_makeBbs() {
  for (var i = 0; i < tempiTempos.length; i++) {
    let tBb = mkSvgCircle({
      svgContainer: tempiPanel.svg,
      cx: 0,
      cy: 0,
      r: TEMPI_BB_RADIUS,
      fill: scrollingCsrClrs[i],
      stroke: 'white',
      strokeW: 0
    });
    tempi_bbs.push(tBb);
  }
}

function tempi_updateBbs(frame, tempoIx) {
  tempiTotalNumFramesPerTempo.forEach((numFrames, tempoIx) => {
    let currFrame = FRAMECOUNT % numFrames;
    let tx = tempiTempoConsts[tempoIx].frameArray[currFrame].x;
    let tCurPx = tempiTempoConsts[tempoIx].frameArray[currFrame].absX;
    let tBbX = tCurPx % Math.round(TEMPI_PX_PER_BEAT);
    let bbiy = tempi_bbOneBeat[tBbX].y;
    let tLineNum = Math.floor(tCurPx / TEMPI_NOTATION_LINE_LENGTH_PX)
    // let ty = bbiy + ((TEMPI_NOTATION_H + TEMPI_GAP_BTWN_NOTATION_LINES) * tLineNum);
    let ty = bbiy + tempiLineY[tempoIx];
    tempi_bbs[tempoIx].setAttributeNS(null, 'cx', tx);
    tempi_bbs[tempoIx].setAttributeNS(null, 'cy', ty);
  });
}

let tempiBeatLines = [];
let tempi_staffDividers=[];

function drawTempiBeatLines() {
  for (var i = 0; i < TEMPI_NUM_NOTATION_LINES; i++) {
    for (var j = 0; j < TEMPI_BEATS_PER_LINE; j++) {
      let tx2 = j * TEMPI_PX_PER_BEAT;
      let y1 = (i * TEMPI_VERT_DISTANCE_BETWEEN_LINES);
      let tBl = mkSvgLine({
        svgContainer: tempiPanel.svg,
        x1: tx2,
        y1: y1,
        x2: tx2,
        y2: y1 + TEMPI_NOTATION_H,
        stroke: 'magenta',
        strokeW: 1
      });
      tempiBeatLines.push(tBl);
    }
    //horizontal staff divider
    if (i > 0) {
      let tsl = mkSvgLine({
        svgContainer: tempiPanel.svg,
        x1: 0,
        y1: tempiLineY[i],
        x2: tempiPanel_W,
        y2: tempiLineY[i],
        stroke: 'white',
        strokeW: 1
      });
      tempi_staffDividers.push(tsl);
    }
  }
}

//#endef Tempi

/*
//#ef Beat Lines
let beatLines = [];

function drawBeatLines() {
  for (var i = 0; i < NUM_NOTATION_LINES; i++) {
    for (var j = 0; j < BEATS_PER_LINE; j++) {
      let tx2 = j * PX_PER_BEAT;
      let y1 = (i * VERT_DISTANCE_BETWEEN_LINES);
      let tBl = mkSvgLine({
        svgContainer: canvas.svg,
        x1: tx2,
        y1: y1,
        x2: tx2,
        y2: y1 + NOTATION_H,
        stroke: 'magenta',
        strokeW: 0.5
      });
      beatLines.push(tBl);
    }
  }
}
//#endef Beat Lines

//#ef Scrolling Cursors
let scrollingCursors = [];
let scrCsrText = [];
let scrollingCsrY1 = 5;
let scrollingCsrH = NOTATION_H - 10;
let scrollingCsrClrs = [];
let lineY = [];
//Tempo Timing
let tempos = [
  [60, 60, ''],
  [83, 83, ''],
  [111, 27.14, 'd'],
  [29, 99, 'a'],
  [47, 47, ''],
  [66, 66, ''],
];
let totalNumFramesPerTempo = [];
let tempoConsts = [];
tempos.forEach((tempoArr, i) => {
  let td = {};
  //convert initial and final tempi from bpm to pixelsPerFrame
  let iTempo = tempoArr[0]; //bpm
  let fTempo = tempoArr[1]; //bpm
  td['iTempoBPM'] = iTempo;
  td['fTempoBPM'] = fTempo;
  // convert bpm to pxPerFrame: pxPerMinute = iTempo * PX_PER_BEAT; pxPerSec = pxPerMinute/60; pxPerFrame = pxPerSec/FRAMERATE
  let iTempoPxPerFrame = ((iTempo * PX_PER_BEAT) / 60) / FRAMERATE;
  let fTempoPxPerFrame = ((fTempo * PX_PER_BEAT) / 60) / FRAMERATE;
  td['iTempoPxPerFrame'] = iTempoPxPerFrame;
  td['fTempoPxPerFrame'] = fTempoPxPerFrame;
  //calc acceleration from initial tempo and final tempo
  // a = (v2 - u2) / 2s ; v=finalVelocity, u=initialVelocity, s=totalDistance
  let tAccel = (Math.pow(fTempoPxPerFrame, 2) - Math.pow(iTempoPxPerFrame, 2)) / (2 * TOTAL_NUM_PX_IN_SCORE);
  td['accel'] = tAccel;
  // Calculate total number of frames from acceleration and distance
  // t = sqrRoot( (2L/a) ) ; L is total pixels
  let totalDurFrames;
  if (tAccel == 0) {
    totalDurFrames = Math.round(TOTAL_NUM_PX_IN_SCORE / iTempoPxPerFrame);
  } else {
    totalDurFrames = Math.round((fTempoPxPerFrame - iTempoPxPerFrame) / tAccel);
  }
  td['totalDurFrames'] = totalDurFrames;
  tempoConsts.push(td);
});
for (var i = 0; i < NUM_NOTATION_LINES; i++) {
  let ty = scrollingCsrY1 + ((NOTATION_H + GAP_BTWN_NOTATION_LINES) * i);
  lineY.push(ty);
}
tempos.forEach((tempo, tix) => {
  scrollingCsrClrs.push(TEMPO_COLORS[tix % TEMPO_COLORS.length]);
});


function calcScrollingCursor() {
  tempoConsts.forEach((tempoObj, tempoIx) => { //run for each tempo
    let frameArray = [];
    let tNumFrames = Math.round(tempoObj.totalDurFrames); //create an array with and index for each frame in the piece per tempo
    for (var frmIx = 0; frmIx < tNumFrames; frmIx++) { //loop for each frame in the piece
      let td = {}; //dictionary to hold position values
      //Calculate x
      let tCurPx = Math.round((tempoObj.iTempoPxPerFrame * frmIx) + ((tempoObj.accel * Math.pow(frmIx, 2)) / 2));
      td['absX'] = tCurPx;
      let tx = tCurPx % NOTATION_LINE_LENGTH_PX; //calculate cursor x location at each frame for this tempo
      td['x'] = tx;
      //Calc Y pos
      let tLineNum = Math.floor(tCurPx / NOTATION_LINE_LENGTH_PX)
      let ty = scrollingCsrY1 + ((NOTATION_H + GAP_BTWN_NOTATION_LINES) * tLineNum);
      td['y'] = ty;
      frameArray.push(td);
    }
    tempoConsts[tempoIx]['frameArray'] = frameArray;
    totalNumFramesPerTempo.push(frameArray.length);
  });
}

function makeScrollingCursors() {
  for (var i = 0; i < tempos.length; i++) {
    let tCsr = mkSvgLine({
      svgContainer: canvas.svg,
      x1: 0,
      y1: scrollingCsrY1,
      x2: 0,
      y2: scrollingCsrY1 + scrollingCsrH,
      stroke: scrollingCsrClrs[i],
      strokeW: 2
    });
    tCsr.setAttributeNS(null, 'stroke-linecap', 'round');
    tCsr.setAttributeNS(null, 'display', 'yes');
    scrollingCursors.push(tCsr);
    //Cursor Text
    let tTxt = mkSvgText({
      svgContainer: canvas.svg,
      x: -19,
      y: scrollingCsrY1 + 11,
      fill: scrollingCsrClrs[i],
      stroke: scrollingCsrClrs[i],
      strokeW: 1,
      justifyH: 'start',
      justifyV: 'auto',
      fontSz: 14,
      fontFamily: 'lato',
      txt: tempos[i][2]
    });
    scrCsrText.push(tTxt);
  }
}

function updateScrollingCsrs(frame, tempoIx) {
  totalNumFramesPerTempo.forEach((numFrames, tempoIx) => {
    let currFrame = FRAMECOUNT % numFrames;
    let tx = tempoConsts[tempoIx].frameArray[currFrame].x;
    let ty = tempoConsts[tempoIx].frameArray[currFrame].y;
    scrollingCursors[tempoIx].setAttributeNS(null, 'x1', tx);
    scrollingCursors[tempoIx].setAttributeNS(null, 'x2', tx);
    scrollingCursors[tempoIx].setAttributeNS(null, 'y1', ty);
    scrollingCursors[tempoIx].setAttributeNS(null, 'y2', ty + scrollingCsrH);
    scrCsrText[tempoIx].setAttributeNS(null, 'x', tx - 12);
    scrCsrText[tempoIx].setAttributeNS(null, 'y', ty + 11);
  });
}
//#endef Scrolling Cursors

//#ef Scrolling Cursor BBs
let BB_RADIUS = 4;
let bbs = [];
// Calculate Ascent and Descent for 1 BB
let bbOneBeat = [];
// let descentPct = 0.6;
let descentPct = 0.8;
let ascentPct = 1 - descentPct;
let ascentNumXpx = Math.ceil(ascentPct * PX_PER_BEAT);
let descentNumXpx = Math.floor(descentPct * PX_PER_BEAT);
// let ascentFactor = 0.45;
let ascentFactor = 0.15;
// let descentFactor = 2.9;
let descentFactor = 5;
let ascentPlot = plot(function(x) { //see Function library; exponential curve
  return Math.pow(x, ascentFactor);
}, [0, 1, 0, 1], ascentNumXpx, scrollingCsrH, scrollingCsrY1);
ascentPlot.forEach((y) => {
  bbOneBeat.push(y);
});
let descentPlot = plot(function(x) {
  return Math.pow(x, descentFactor);
}, [0, 1, 1, 0], descentNumXpx, scrollingCsrH, scrollingCsrY1);
descentPlot.forEach((y) => {
  bbOneBeat.push(y);
});

function makeBbs() {
  for (var i = 0; i < tempos.length; i++) {
    let tBb = mkSvgCircle({
      svgContainer: canvas.svg,
      cx: 0,
      cy: 0,
      r: BB_RADIUS,
      fill: scrollingCsrClrs[i],
      stroke: 'white',
      strokeW: 0
    });
    bbs.push(tBb);
  }
}

function updateBbs(frame, tempoIx) {
  totalNumFramesPerTempo.forEach((numFrames, tempoIx) => {
    let currFrame = FRAMECOUNT % numFrames;
    let tx = tempoConsts[tempoIx].frameArray[currFrame].x;
    let tCurPx = tempoConsts[tempoIx].frameArray[currFrame].absX;
    let tBbX = tCurPx % Math.round(PX_PER_BEAT);
    let bbiy = bbOneBeat[tBbX].y;
    let tLineNum = Math.floor(tCurPx / NOTATION_LINE_LENGTH_PX)
    let ty = bbiy + ((NOTATION_H + GAP_BTWN_NOTATION_LINES) * tLineNum);
    bbs[tempoIx].setAttributeNS(null, 'cx', tx);
    bbs[tempoIx].setAttributeNS(null, 'cy', ty);
  });
}
//#endef Scrolling Cursor BBs

*/




//
