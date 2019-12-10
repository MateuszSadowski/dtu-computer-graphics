// JavaScript source code

onload = init;

let ORBIT_STEP = 0.01;
//TODO: remove these constants
let TRANSLATION_SCALE_FACTOR = 200;
let Z_TRANSLATION_RANGE_FACTOR = 1;
let MAX_ORBIT_RADIUS = 25;

function init() {
	var canvas = document.getElementById("c");
	var gl = setupWebGL(canvas);
	if (!gl) {
		return;
	}

	var program = initShaders(gl, "vertex-shader", "fragment-shader");
	gl.useProgram(program);
	gl.vBuffer = null;
	gl.enable(gl.DEPTH_TEST);
	// gl.enable(gl.CULL_FACE);
	// gl.frontFace(gl.CW);

	// === setup UI ===
	var translation = [0, 0, 0];
	var rotation = [0, 0, 0];
	var scaleValues = [1, 1, 1];
	var numOfSubdivisions = 4;
	var orbitRadius = 25;
	var orbitAngle = 0;
	var shouldOrbit = 0;

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
	webglLessonsUI.setupSlider("#orbitR", { value: orbitRadius, slide: updateOrbitRadius(), min: 1, max: MAX_ORBIT_RADIUS, step: 0.01, precision: 2 });
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
	var toggleOrbitButton = document.getElementById("orbit");
	toggleOrbitButton.addEventListener("click", () => {
		shouldOrbit = (shouldOrbit + 1) % 2;
		orbit();
	})

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

	function updateOrbitRadius() {
		return function (event, ui) {
			orbitRadius = ui.value;
			render();
		};
	}

	var groundQuad = [
		vec4(-2.0, -1.0, -1.0, 1.0),
		vec4(2.0, -1.0, -1.0, 1.0),
		vec4(2.0, -1.0, -5.0, 1.0),
		vec4(-2.0, -1.0, -5.0, 1.0)
	];

	var quad1 = [
		vec4(0.25, -0.5, -1.25, 1.0),
		vec4(0.75, -0.5, -1.25, 1.0),
		vec4(0.75, -0.5, -1.75, 1.0),
		vec4(0.25, -0.5, -1.75, 1.0)
	];

	var quad2 = [
		vec4(-1.0, -1.0, -1.25, 1.0),
		vec4(-1.0, 0.0, -1.25, 1.0),
		vec4(-1.0, -1.0, -1.75, 1.0),
		vec4(-1.0, 0.0, -1.75, 1.0)
	];

	// light source
	var lightDirection = vec4(0.0, 0.0, -1.0, 0.0);
	var lightEmission = vec4(1.0, 1.0, 1.0, 1.0);
	var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0);
	var materialDiffuse = 1.0;
	var materialSpecular = 1.0;
	var materialShininess = 100.0;
	//TODO: Add ambient coefficient

	// texture
	var texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.uniform1i(gl.getUniformLocation(program, "u_TexMap"), 0);

	var texSize = 64;
	var numRows = 8;
	var numCols = 8;
	var myTexels = new Uint8Array(4 * texSize * texSize);
	for (var i = 0; i < texSize; ++i) {
		for (var j = 0; j < texSize; ++j) {
			var patchx = Math.floor(i / (texSize / numRows));
			var patchy = Math.floor(j / (texSize / numCols));

			var c = (patchx % 2 !== patchy % 2 ? 255 : 0);

			myTexels[4 * i * texSize + 4 * j] = c;
			myTexels[4 * i * texSize + 4 * j + 1] = c;
			myTexels[4 * i * texSize + 4 * j + 2] = c;
			myTexels[4 * i * texSize + 4 * j + 3] = 255;
		}
	}

	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, myTexels);

	var texCoord = [
		vec2(-1.5, 0.0),
		vec2(2.5, 0.0),
		vec2(2.5, 10.0),
		vec2(-1.5, 10.0)
	];

	var tBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoord), gl.STATIC_DRAW);

	var aTexCoord = gl.getAttribLocation(program, "a_TexCoord");
	gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(aTexCoord);

	//TODO: Add buttons to change gl.TEXTURE_WRAP_S and gl.TEXTURE_MIN_FILTER
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.generateMipmap(gl.TEXTURE_2D);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

	// upload values to shader
	var vBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);

	var vPosition = gl.getAttribLocation(program, "a_Position");
	gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(vPosition);

	var uLightPosition = gl.getUniformLocation(program, "u_LightPosition");
	gl.uniform4fv(uLightPosition, lightDirection);

	var uLightEmission = gl.getUniformLocation(program, "u_LightEmission");
	gl.uniform4fv(uLightEmission, lightEmission);

	var uLightAmbinet = gl.getUniformLocation(program, "u_LightAmbient");
	gl.uniform4fv(uLightAmbinet, lightAmbient);

	var uMaterialDiffuse = gl.getUniformLocation(program, "u_MaterialDiffuse");
	gl.uniform1f(uMaterialDiffuse, materialDiffuse);

	var uMaterialSpecular = gl.getUniformLocation(program, "u_MaterialSpecular");
	gl.uniform1f(uMaterialSpecular, materialSpecular);

	var uMaterialShininess = gl.getUniformLocation(program, "u_MaterialShininess");
	gl.uniform1f(uMaterialShininess, materialShininess);

	// === setup methods ===
	function orbit() {
		if (shouldOrbit) {
			eye = vec3(orbitRadius * Math.sin(orbitAngle), 0, orbitRadius * Math.cos(orbitAngle));
			vMat = lookAt(eye, at, up);
			render();
			orbitAngle += ORBIT_STEP;
			requestAnimationFrame(orbit);
		} else {
			render();
		}
	}

	// var eye = vec3(orbitRadius * Math.sin(orbitAngle), 0, orbitRadius * Math.cos(orbitAngle));
	var eye = vec3(0, 0, 0);
	var at = vec3(0, 0, 0);
	var up = vec3(0, 1, 0);

	// var pMat = ortho(-20, 20, -20, 20, -100, 100);
	var pMat = perspective(90, 1, 0.1, 100);
	var vMat = lookAt(eye, at, up);

	function render() {
		gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		// compute matrices
		// last specified transformation is first to be applied
		var mMat = mat4();
		mMat = mult(mMat, translate(translation[0], translation[1], translation[2]));
		mMat = mult(mMat, rotate(rotation[0], vec3(1, 0, 0)));
		mMat = mult(mMat, rotate(rotation[1], vec3(0, 1, 0)));
		mMat = mult(mMat, rotate(rotation[2], vec3(0, 0, 1)));
		mMat = mult(mMat, scale(scaleValues[0], scaleValues[1], scaleValues[2]));
		var mvMat = mult(vMat, mMat);
		var mvpMat = mult(pMat, mvMat);

		var N = normalMatrix(mvMat, false);
		var uNMatrix = gl.getUniformLocation(program, "u_NMatrix");
		gl.uniformMatrix3fv(uNMatrix, false, flatten(N));

		var umvMatrix = gl.getUniformLocation(program, "u_mvMatrix");
		gl.uniformMatrix4fv(umvMatrix, false, flatten(mvMat));

		var umvpMatrix = gl.getUniformLocation(program, "u_mvpMatrix");
		gl.uniformMatrix4fv(umvpMatrix, false, flatten(mvpMat));

		//TODO: optimize 
		gl.deleteBuffer(gl.vBuffer);
		gl.vBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, flatten(groundQuad), gl.STATIC_DRAW);

		gl.drawArrays(gl.TRIANGLE_FAN, 0, groundQuad.length);

		gl.deleteBuffer(gl.vBuffer);
		gl.vBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, flatten(quad1), gl.STATIC_DRAW);

		gl.drawArrays(gl.TRIANGLE_FAN, 0, quad1.length);

		gl.deleteBuffer(gl.vBuffer);
		gl.vBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, flatten(quad2), gl.STATIC_DRAW);

		gl.drawArrays(gl.TRIANGLE_STRIP, 0, quad2.length);

	}

	// === start program ===
	render();
}

/**
* @param {Element} canvas. The canvas element to create a context from.
* @return {WebGLRenderingContext} The created context.
*/
function setupWebGL(canvas) {
	return WebGLUtils.setupWebGL(canvas);
}