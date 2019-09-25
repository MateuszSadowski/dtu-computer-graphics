onload = init;

let CANVAS_WIDTH = 512;
let CANVAS_HEIGHT = 512;
let MAX_VERTICES = 1000;
let bgColors = [vec3(0, 0, 0), vec3(1, 0, 0), vec3(0, 1, 0), vec3(0, 0, 1), vec3(1, 1, 1)];

var gl;
var numOfPoints = 0;
var index = 0;
var drawingMode;
var pointIndices = [];
var triangleIndices = [];
var trianglePointsDrawn = 0;
var circlePointsDrawn = 0;

function init() {
    //Set up canvas
    var canvas = document.getElementById("c");
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    let chooseColorMenu = document.getElementById("choose-color-menu");
    let clearCanvasMenu = document.getElementById("clear-canvas-menu");
    let clearCanvasButton = document.getElementById("clear-canvas-button");
    canvas.addEventListener("click", function (ev) {
        var boundingBox = ev.target.getBoundingClientRect();
        mousePosition = vec2(2 * (ev.clientX - boundingBox.left) / canvas.width - 1, 2 * (canvas.height - ev.clientY + boundingBox.top - 1) / canvas.height - 1);
        let zCord = 1 - 2 * (index + 1) / MAX_VERTICES;
        let pointCords = vec3(mousePosition, zCord);
        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, index * sizeof['vec3'], flatten(pointCords));
        gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, index * sizeof['vec3'], flatten(bgColors[chooseColorMenu.selectedIndex]));
        addIndex(index);
        numOfPoints = Math.max(numOfPoints, ++index);
        index %= MAX_VERTICES;
        // render();
        draw();
    });
    clearCanvasButton.addEventListener("click", function () {
        var bgColor = bgColors[clearCanvasMenu.selectedIndex];
        gl.clearColor(bgColor[0], bgColor[1], bgColor[2], 1);
        numOfPoints = 0;
        index = 0;
        //TODO: fix that the vertex buffer is not emptied on clearing canvas
        render();
    });

    //https://stackoverflow.com/questions/8922002/attach-event-listener-through-javascript-to-radio-button
    document.addDelegatedListener("click", "input[type='radio']", function (event) {
        if (document.querySelector('input[name=drawing-mode]:checked').value === "points") {
            drawingMode = gl.POINTS;
        } else if (document.querySelector('input[name=drawing-mode]:checked').value === "triangles") {
            drawingMode = gl.TRIANGLES;
        } else if (document.querySelector('input[name=drawing-mode]:checked').value === "circles") {
            drawingMode = gl.TRIANGLE_FAN;
        }
    });

    //Set up WebGL context
    gl = setupWebGL(canvas);
    var bgColor = bgColors[clearCanvasMenu.selectedIndex];
    gl.clearColor(bgColor[0], bgColor[1], bgColor[2], 1);
    gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    drawingMode = gl.POINTS; //default

    //Initialize shaders
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    //Set up arrays of indices for different drawing mode

    //Provide data for shaders
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, MAX_VERTICES * sizeof['vec3'], gl.STATIC_DRAW);
    var vPosition = gl.getAttribLocation(program, "a_Position");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, MAX_VERTICES * sizeof['vec3'], gl.STATIC_DRAW);
    var vColor = gl.getAttribLocation(program, "a_Color");
    gl.vertexAttribPointer(vColor, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);
    // vColor = vec3(1, 1, 0);
}

// function addVertex(position, index) {
// TODO: Extract code for adding vertices do the buffer
// }

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawArrays(drawingMode, 0, numOfPoints);
}

function draw() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var pointIndicesTmp = pointIndices.slice(0).reverse();
    var triangleIndicesTmp = triangleIndices.slice(0).reverse();

    while (pointIndicesTmp.length > 0) {
        var pointsToDraw = getPointsToDraw(pointIndicesTmp);
        if (pointsToDraw !== -1) {
            gl.drawArrays(gl.POINTS, pointsToDraw[0], pointsToDraw.length);
        }
    }

    while (triangleIndicesTmp.length > 0) {
        var trianglesToDraw = getTrianglesToDraw(triangleIndicesTmp);
        if (trianglesToDraw !== -1) {
            trianglesToDraw = flatten(trianglesToDraw);
            gl.drawArrays(gl.TRIANGLES, trianglesToDraw[0], trianglesToDraw.length);
        }
    }

}

function getPointsToDraw(pointInd) {
    if (pointInd.length === 0) {
        return -1;
    }

    var pointsToDraw = [];
    var ind = pointInd.pop();
    pointsToDraw.push(ind);
    while (pointInd.length > 0 && ind - pointInd[0] === 1) {
        ind = pointInd.pop();
        pointsToDraw.push(ind);
    }

    return pointsToDraw;
}

function getTrianglesToDraw(triangleInd) {
    if (triangleInd.length === 0) {
        return -1;
    }

    var trianglePointsToDraw = [];
    var ind = triangleInd.pop();
    trianglePointsToDraw.push(ind);
    while (triangleInd.length > 0 && ind - triangleInd[0] === 1) {
        ind = triangleInd.pop();
        trianglePointsToDraw.push(ind);
    }

    return trianglePointsToDraw;
}

function addIndex(index) {
    if (drawingMode === gl.POINTS) {
        pointIndices.push(index);
    } else if (drawingMode === gl.TRIANGLES && trianglePointsDrawn < 2) {
        pointIndices.push(index);
        trianglePointsDrawn++;
    } else if (drawingMode === gl.TRIANGLES && trianglePointsDrawn === 2) {
        var triangleIndicesTmp = [];
        triangleIndicesTmp.push(index);
        triangleIndicesTmp.push(pointIndices.pop());
        triangleIndicesTmp.push(pointIndices.pop());
        triangleIndicesTmp.reverse();
        triangleIndices.push(triangleIndicesTmp);
        trianglePointsDrawn = 0;
    } else if (drawingMode === gl.TRIANGLE_FAN && circlePointsDrawn < 1) {
        pointIndices.push(index);
        circlePointsDrawn++;
    } else if (drawingMode === gl.TRIANGLE_FAN && circlePointsDrawn === 1) {
        var circleIndicesTmp = [];
        var center = pointIndices.pop();
        circleIndicesTmp.push(center);
        circleIndicesTmp.push(index);
        var circumferenceIndices = addCircumferencePoints(center, index);
    }
}

function addCircumferencePoints(center, circumPoint) {
    var radius = Math.hypot(center[0] - circumPoint[0], center[1] - circumPoint[1]);

    var vertices = [];
    var colors = [];
    var indices = [];
    var indexTmp = index;
    vertices.push(center);
    for (let i = 0; i <= 360; i++) {
        var j = i * Math.PI / 180;
        vertices.push(vec2(
            radius * Math.sin(j),
            radius * Math.cos(j),
            1 - 2 * (index + 1) / MAX_VERTICES
        ));
        colors.push(bgColors[chooseColorMenu.selectedIndex]);
        indices.push(indexTmp++);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, index * sizeof['vec3'], flatten(vertices));
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, index * sizeof['vec3'], flatten(colors));
    index += vertices.length;

    return indices;
}

/**
* @param {Element} canvas. The canvas element to create a context from.
* @return {WebGLRenderingContext} The created context.
*/
function setupWebGL(canvas) {
    return WebGLUtils.setupWebGL(canvas);
}

//https://stackoverflow.com/questions/8922002/attach-event-listener-through-javascript-to-radio-button
window.EventTarget.prototype.addDelegatedListener = function (type, delegateSelector, listener) {
    this.addEventListener(type, function (event) {
        if (event.target && event.target.matches(delegateSelector)) {
            listener.call(event.target, event)
        }
    });
}
