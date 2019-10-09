// JavaScript source code

onload = init;

function init(){
	var canvas = document.getElementById("c");
    var gl = setupWebGL(canvas);
    
	var program = initShaders(gl, "vertex-shader", "fragment-shader");
	gl.useProgram(program);
	
	// vertices for a cube
	var cube1 = [
		vec4(-0.5, -0.5, 0.5, 1.0),
		vec4(-0.5, 0.5, 0.5, 1.0),
		vec4(0.5, 0.5, 0.5, 1.0),
		vec4(0.5, -0.5, 0.5, 1.0),
		vec4(-0.5, -0.5, -0.5, 1.0),
		vec4(-0.5, 0.5, -0.5, 1.0),
		vec4(0.5, 0.5, -0.5, 1.0),
		vec4(0.5, -0.5, -0.5, 1.0)
	];
	var cube2 = [
		vec4(-0.5, -0.5, 0.5, 1.0),
		vec4(-0.5, 0.5, 0.5, 1.0),
		vec4(0.5, 0.5, 0.5, 1.0),
		vec4(0.5, -0.5, 0.5, 1.0),
		vec4(-0.5, -0.5, -0.5, 1.0),
		vec4(-0.5, 0.5, -0.5, 1.0),
		vec4(0.5, 0.5, -0.5, 1.0),
		vec4(0.5, -0.5, -0.5, 1.0)
	];
	var cube3 = [
		vec4(-0.5, -0.5, 0.5, 1.0),
		vec4(-0.5, 0.5, 0.5, 1.0),
		vec4(0.5, 0.5, 0.5, 1.0),
		vec4(0.5, -0.5, 0.5, 1.0),
		vec4(-0.5, -0.5, -0.5, 1.0),
		vec4(-0.5, 0.5, -0.5, 1.0),
		vec4(0.5, 0.5, -0.5, 1.0),
		vec4(0.5, -0.5, -0.5, 1.0)
	];
	var vertices = cube1.concat(cube2).concat(cube3);
	console.log(vertices);
	var indices = [
		1, 0,
		0, 3,
		3, 2,
		2, 1,
		3, 7,
		7, 6,
		6, 2,
		0, 4,
		4, 7,
		7, 3,
		6, 5,
		5, 1,
		4, 5,
		1, 0,
		0, 3,
		3, 2,
		2, 1,
		3, 7,
		7, 6,
		6, 2,
		0, 4,
		4, 7,
		7, 3,
		6, 5,
		5, 1,
		4, 5,
		1, 0,
		0, 3,
		3, 2,
		2, 1,
		3, 7,
		7, 6,
		6, 2,
		0, 4,
		4, 7,
		7, 3,
		6, 5,
		5, 1,
		4, 5,
	];
	var eye = vec3(0, 1, 7);
	var at = vec3(0, 0, 0);
	var up = vec3(0, 1, 0);

	// var pMat = ortho(-2, 2, -2, 2, -2, 2);
	var pMat = perspective(45, 1, 0, 20);
	var vMat = lookAt(eye, at, up);
	var mMat = rotate(117, vec3(1, 0, 0));
	
	// rotate cube into isometric view
	mMat = mult(mMat, rotateX(35.26));
	// mMat = mult(mMat, rotateY(45));

	var mvpMat = mult(pMat, mult(vMat, mMat));

	var MVP = gl.getUniformLocation(program, "mvp");
	gl.uniformMatrix4fv(MVP, false, flatten(mvpMat));

	var vBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);
	
	var iBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(indices), gl.STATIC_DRAW);

	var vPosition = gl.getAttribLocation(program, "a_Position");
	gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(vPosition);

	
	// colors
	var vertexColors = [
		[ 0.0, 0.0, 0.0, 1.0 ], // black
		[ 1.0, 0.0, 0.0, 1.0 ], // red
		[ 1.0, 1.0, 0.0, 1.0 ], // yellow
		[ 0.0, 1.0, 0.0, 1.0 ], // green
		[ 0.0, 0.0, 1.0, 1.0 ], // blue
		[ 1.0, 0.0, 1.0, 1.0 ], // magenta
		[ 1.0, 1.0, 1.0, 1.0 ], // white
		[ 0.0, 1.0, 1.0, 1.0 ] // cyan
	];

	var cBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(vertexColors), gl.STATIC_DRAW);

	var aColor = gl.getAttribLocation(program, "a_Color");
	gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 0, 0) ;
	gl.enableVertexAttribArray(aColor);
	

	gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

	render(gl, indices.length / 3, 0);

	mMat = translate(vec3(2, 0, 0));
	mMat = mult(mMat, rotateX(8));
	mMat = mult(mMat, rotateY(25));
	mvpMat = mult(pMat, mult(vMat, mMat));
	gl.uniformMatrix4fv(MVP, false, flatten(mvpMat));

	render(gl, indices.length / 3, indices.length / 3);

	mMat = translate(vec3(-2, 0, 0));
	mMat = mult(mMat, rotateX(-8));
	mMat = mult(mMat, rotateY(10));
	mvpMat = mult(pMat, mult(vMat, mMat));
	gl.uniformMatrix4fv(MVP, false, flatten(mvpMat));

	render(gl, indices.length / 3, 2 * indices.length / 3);
}


/**
* @param {Element} canvas. The canvas element to create a context from.
* @return {WebGLRenderingContext} The created context.
*/
function setupWebGL(canvas) {
  return WebGLUtils.setupWebGL(canvas);
}

/**
Clear and draw the points
*/
function render(gl, numPoints, offset){
	// gl.clear(gl.COLOR_BUFFER_BIT);
	//TODO: Move model matrix creation into render and do seperate draw calls for each cube instance
	gl.drawElements(gl.LINES, numPoints, gl.UNSIGNED_BYTE, offset);
}