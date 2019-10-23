// JavaScript source code

onload = init;

let TRANSLATION_SCALE_FACTOR = 200;
let Z_TRANSLATION_RANGE_FACTOR = 10;

function init() {
	var canvas = document.getElementById("c");
	var gl = setupWebGL(canvas);
	if (!gl) {
		return;
	}

	var program = initShaders(gl, "vertex-shader", "fragment-shader");
	gl.useProgram(program);
	gl.enable(gl.DEPTH_TEST);

	var translation = [0, 0, 0];
	var rotation = [128, 140, 26];
	var scaleValues = [1, 1, 1];
	var numOfSubdivisions = 0;

	// setup UI
	// https://webglfundamentals.org/webgl/lessons/webgl-3d-orthographic.html
	webglLessonsUI.setupSlider("#x", { value: translation[0], slide: updatePosition(0), min: -gl.canvas.width, max: gl.canvas.width });
	webglLessonsUI.setupSlider("#y", { value: translation[1], slide: updatePosition(1), min: -gl.canvas.height, max: gl.canvas.height });
	webglLessonsUI.setupSlider("#z", { value: translation[2], slide: updatePosition(2), min: -gl.canvas.height * Z_TRANSLATION_RANGE_FACTOR, max: gl.canvas.height * Z_TRANSLATION_RANGE_FACTOR });
	webglLessonsUI.setupSlider("#angleX", { value: rotation[0], slide: updateRotation(0), max: 360 });
	webglLessonsUI.setupSlider("#angleY", { value: rotation[1], slide: updateRotation(1), max: 360 });
	webglLessonsUI.setupSlider("#angleZ", { value: rotation[2], slide: updateRotation(2), max: 360 });
	webglLessonsUI.setupSlider("#scaleX", { value: scaleValues[0], slide: updateScale(0), min: -5, max: 5, step: 0.01, precision: 2 });
	webglLessonsUI.setupSlider("#scaleY", { value: scaleValues[1], slide: updateScale(1), min: -5, max: 5, step: 0.01, precision: 2 });
	webglLessonsUI.setupSlider("#scaleZ", { value: scaleValues[2], slide: updateScale(2), min: -5, max: 5, step: 0.01, precision: 2 });
	// buttons
	var decreaseSubdivisionButton = document.getElementById("dec-sub");
	decreaseSubdivisionButton.addEventListener("click", () => {
		if (numOfSubdivisions > 0) {
			numOfSubdivisions--;
			render();
		}
	})
	var increaseSubdivisionButton = document.getElementById("inc-sub");
	increaseSubdivisionButton.addEventListener("click", () => {
		if (numOfSubdivisions < 9) {
			numOfSubdivisions++;
		}
		render();
	})


	// vertices for a sphere
	var va = vec4(0.0, 0.0, -1.0, 1);
	var vb = vec4(0.0, 0.942809, 0.333333, 1);
	var vc = vec4(-0.816497, -0.471405, 0.333333, 1);
	var vd = vec4(0.816497, -0.471405, 0.333333, 1);
	var tetrahedron = [];

	// vertices for a cube
	// var cube = [
	// 	vec4(1.0, 1.0, 1.0, 1.0),
	// 	vec4(-1.0, 1.0, 1.0, 1.0),
	// 	vec4(-1.0, -1.0, 1.0, 1.0),
	// 	vec4(1.0, -1.0, 1.0, 1.0),
	// 	vec4(1.0, -1.0, -1.0, 1.0),
	// 	vec4(1.0, 1.0, -1.0, 1.0),
	// 	vec4(-1.0, 1.0, -1.0, 1.0),
	// 	vec4(-1.0, -1.0, -1.0, 1.0)
	// ];
	// var indices = [];
	// var index = 0;

	function updatePosition(index) {
		return function (event, ui) {
			translation[index] = ui.value / TRANSLATION_SCALE_FACTOR;
			render();
		};
	}

	function updateRotation(index) {
		return function (event, ui) {
			rotation[index] = ui.value;
			render();
		};
	}

	function updateScale(index) {
		return function (event, ui) {
			scaleValues[index] = ui.value;
			render();
		};
	}
	var eye = vec3(0, 20, 20);
	var at = vec3(0, 0, 0);
	var up = vec3(0, 1, 0);

	var pMat = ortho(-2, 2, -2, 2, -50, 50);
	// TODO: Enable perspective
	// var pMat = perspective(45, 1, 0, 20);
	var vMat = lookAt(eye, at, up);

	function makeTetrahedron(a, b, c, d, n) {
		tetrahedron = [];
		divideTriangle(a, b, c, n);
		divideTriangle(d, c, b, n);
		divideTriangle(a, d, b, n);
		divideTriangle(a, c, d, n);
	}

	function divideTriangle(a, b, c, count) {
		if (count > 0) {
			var ab = normalize(mix(a, b, 0.5), true);
			var ac = normalize(mix(a, c, 0.5), true);
			var bc = normalize(mix(b, c, 0.5), true);
			divideTriangle(a, ab, ac, count - 1);
			divideTriangle(ab, b, bc, count - 1);
			divideTriangle(bc, c, ac, count - 1);
			divideTriangle(ab, bc, ac, count - 1);
		}
		else {
			triangle(a, b, c);
		}
	}

	function triangle(a, b, c) {
		tetrahedron.push(a);
		tetrahedron.push(b);
		tetrahedron.push(c);
	}

	function render() {
		gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		makeTetrahedron(va, vb, vc, vd, numOfSubdivisions);
		gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, flatten(tetrahedron), gl.STATIC_DRAW);

		// compute matrices
		// last specified transformation is first to be applied
		var mMat = mat4();
		mMat = mult(mMat, translate(translation[0], translation[1], translation[2]));
		mMat = mult(mMat, rotate(rotation[0], vec3(1, 0, 0)));
		mMat = mult(mMat, rotate(rotation[1], vec3(0, 1, 0)));
		mMat = mult(mMat, rotate(rotation[2], vec3(0, 0, 1)));
		mMat = mult(mMat, scale(scaleValues[0], scaleValues[1], scaleValues[2]));
		var mvpMat = mult(pMat, mult(vMat, mMat));

		var uMatrix = gl.getUniformLocation(program, "u_Matrix");
		gl.uniformMatrix4fv(uMatrix, false, flatten(mvpMat));
		// gl.drawElements(gl.TRIANGLES, numPoints, gl.UNSIGNED_BYTE, offset);
		gl.drawArrays(gl.TRIANGLES, 0, tetrahedron.length);
	}

	var vBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
	// gl.bufferData(gl.ARRAY_BUFFER, flatten(tetrahedron), gl.STATIC_DRAW);

	var vPosition = gl.getAttribLocation(program, "a_Position");
	gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(vPosition);

	// var iBuffer = gl.createBuffer();
	// gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
	// gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(indices), gl.STATIC_DRAW);

	// colors
	// var vertexColors = [
	// 	[0.0, 0.0, 0.0, 1.0], // black
	// 	[1.0, 0.0, 0.0, 1.0], // red
	// 	[1.0, 1.0, 0.0, 1.0], // yellow
	// 	[0.0, 1.0, 0.0, 1.0], // green
	// 	[0.0, 0.0, 1.0, 1.0], // blue
	// 	[1.0, 0.0, 1.0, 1.0], // magenta
	// 	[1.0, 1.0, 1.0, 1.0], // white
	// 	[0.0, 1.0, 1.0, 1.0] // cyan
	// ];

	// var cBuffer = gl.createBuffer();
	// gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
	// gl.bufferData(gl.ARRAY_BUFFER, flatten(vertexColors), gl.STATIC_DRAW);

	// var aColor = gl.getAttribLocation(program, "a_Color");
	// gl.vertexAttribPointer(aColor, 4, gl.FLOAT, false, 0, 0);
	// gl.enableVertexAttribArray(aColor);

	render();
}

/**
* @param {Element} canvas. The canvas element to create a context from.
* @return {WebGLRenderingContext} The created context.
*/
function setupWebGL(canvas) {
	return WebGLUtils.setupWebGL(canvas);
}