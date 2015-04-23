var gl, program, canvas;
var points;
var num_vertices = 0; var num_objects = 0; var n = 0;
var object_index = [];
var verticesArray = []; var temp_verticesArray = [];
var colorsArray = []; var temp_colorsArray = [];
var color_index = 0;
var colors = [
	[ 1.0, 0.0, 0.0, 1.0 ],  // red
	[ 0.0, 1.0, 0.0, 1.0 ],  // green
	[ 0.0, 0.0, 1.0, 1.0 ],  // blue
	[ 0.0, 0.0, 0.0, 1.0 ],  // black
	[ 1.0, 1.0, 1.0, 1.0 ],  // white
	[ 1.0, 1.0, 0.0, 1.0 ],  // yellow
	[ 1.0, 0.0, 1.0, 1.0 ],  // magenta
	[ 0.0, 1.0, 1.0, 1.0 ]   // cyan
];
var object_origin  = [];
var theta = []; var xaxis = 0; var yaxis = 1; var zaxis = 2;
var dr = 2;
var scale = [];
var dx = []; var dy = []; var dz = [];
var cbuffer, vbuffer, vColor, vPosition;
var move_all = false;
var uModelViewMatrix; var ModelViewMatrix = [];
var uWorldMatrix; var WorldMatrix = [];

// Perspective Variables:
	var perspectiveMatrix; var uPerspectiveMatrix;
	var left = -3; var right = 3; var bottom = -3; var ytop = 3;
	var near = -3; var far = 3;
	var at = vec3(0.0,0.0,0.0);
	var up = vec3(0.0,1.0,0.0);

// Light Variables:
	var normalArray = []; var temp_normalArray = [];
	var vNormal, nbuffer; //var normalMatrix = mat3(); var uNormalMatrix;
	// var ambientColor, diffuseColor, specularColor; // Not Used ?? 
	var ambientProduct, diffuseProduct, specularProduct; // Not Used ?? 

	// Working on Being able to modify these from web page:
	var lightPosition = vec4(1.0, 1.0, 1.0, 0.0 );
	var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0 );
	var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
	var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

	var materialAmbient = vec4( 1.0, 0.0, 1.0, 1.0 );
	var materialDiffuse = vec4( 1.0, 0.8, 0.0, 1.0);
	var materialSpecular = vec4( 1.0, 0.8, 0.0, 1.0 );
	var materialShininess = 100.0;

// Texture Variables:
	var texCoordArray = []; var temp_texCoordArray = [];
	var texture, texture1, texture2, texbuffer, aTexCoord;
	var texSize = 32;
	var texCoord = [
	/*	vec2(0, 0),
		vec2(0, 1),
		vec2(1, 1),
		vec2(1, 0)/**/
		vec2(0, 0),
		vec2(1, 0),
		vec2(0, 1),
	];

// Main Program:
window.onload = function init() {
canvas = document.getElementById( "gl-canvas" );
gl = WebGLUtils.setupWebGL( canvas );
if ( !gl ) { alert( "WebGL isn't available" ); }

canvas.addEventListener("mousedown",moveObject);

canvas.addEventListener("click",function(event){
	window.addEventListener("keydown",RotateObject);
});
//

// Contains all event listeners for webpage buttons and sliders, etc 
buttonHandler(); // Used to clean up init program

// Configure WebGL
//
gl.viewport( 0, 0, canvas.width, canvas.height );
gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
gl.enable(gl.DEPTH_TEST);

// Load Shaders and initialize attribute buffers
program = initShaders( gl, "vertex-shader", "fragment-shader" );
gl.useProgram( program );


// My Program
//pyramid([0,0,0],0.5,0.5,0.5);
//triangle([0,0,0],[0,0.5,0],[0.5,0,0])

// Initiate Buffers:
cbuffer = gl.createBuffer();
vColor = gl.getAttribLocation(program, "vColor");
vbuffer = gl.createBuffer();
vPosition = gl.getAttribLocation(program, "vPosition");
texbuffer = gl.createBuffer();
aTexCoord =  gl.getAttribLocation(program, "aTexCoord");

nbuffer = gl.createBuffer();
vNormal = gl.getAttribLocation(program,"vNormal");

// Initiate Shader matrix variables
uModelViewMatrix = gl.getUniformLocation(program, "uModelViewMatrix");
uWorldMatrix = gl.getUniformLocation(program,"uWorldMatrix");

// Create Global World Matrix - Work in progress
init_arrays();

// Perspective Matrix:
uPerspectiveMatrix = gl.getUniformLocation(program,"uPerspectiveMatrix");
perspectiveMatrix = ortho(left,right,bottom,ytop,near,far);
gl.uniformMatrix4fv(uPerspectiveMatrix, false, flatten(perspectiveMatrix));

LightCalculations();

createTexture();
render();
};

function render() {
	// Reset The Data
	gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	moveMatrixModel(0);
	gl.uniformMatrix4fv(uWorldMatrix, 0, flatten(ModelViewMatrix[0]));	
	
	// Print Objects
	if(num_objects > 0) { // Accounts for 
		for(j = 0; j < num_objects/2; ++j){ 
			var i = j + 1; // adds 1 to skip drawing World Data
			var ind1 = 2*i-1;

			prep_buffers(ind1);	
			moveMatrixModel(ind1);
			gl.uniformMatrix4fv(uModelViewMatrix, 0, flatten( ModelViewMatrix[ind1] ) );
		
			var start = object_index[ind1][0]; var end = object_index[ind1][1];
			gl.drawArrays(gl.TRIANGLES,0,end-start);
			
			var ind2 = 2*(i);
			prep_buffers(ind2);					
			gl.uniformMatrix4fv(uModelViewMatrix, 0, flatten( ModelViewMatrix[ind1]));
			
			start = object_index[ind2][0]; var end = object_index[ind2][1];
			gl.drawArrays(gl.LINES,0,end-start);
		}
	}
	requestAnimFrame(render);
}

function pyramid( origin, b, w, h){
	console.log("Pyramid function ran")
	var v1, v2, v3, v4, v5;
	var x = origin[0]; var y = origin[1]; var z = origin[2];
	
	v1 = vec3(x-b/2,y-w/2,z);
	v2 = vec3(x-b/2,y+w/2,z);
	v3 = vec3(x+b/2,y+w/2,z);
	v4 = vec3(x+b/2,y-w/2,z);
	v5 = vec3(x,y,z+h);
	
	construct_pyramid(v1, v2, v3, v4, v5);
}

function triangle(a,b,c){ 
    var t1 = subtract(b, a);
    var t2 = subtract(c, b);	
	var normal = cross(t1, t2);
	normal = vec3(normal);	
	
	temp_verticesArray.push(a);
	temp_colorsArray.push(colors[color_index]);
	temp_normalArray.push(normal);
	temp_texCoordArray.push(texCoord[0]);

	temp_verticesArray.push(b);
	temp_colorsArray.push(colors[color_index]);
	temp_normalArray.push(normal);
	temp_texCoordArray.push(texCoord[1]);

	temp_verticesArray.push(c);
	temp_colorsArray.push(colors[color_index]);
	temp_normalArray.push(normal);
	temp_texCoordArray.push(texCoord[2]);

	num_vertices += 3;
}

function lines(a, b){ 
	temp_verticesArray.push(a);
	temp_colorsArray.push(colors[4]);
	temp_normalArray.push(vec3(0,0,0));	
	temp_texCoordArray.push(vec2(0,0));
	
	temp_verticesArray.push(b);
	temp_colorsArray.push(colors[4]);
	temp_normalArray.push(vec3(0,0,0));	
	temp_texCoordArray.push(vec2(0,0));

	num_vertices += 2;
}

function construct_pyramid(a,b,c,d,e){ // edit out testing stuff
	var start = num_vertices;
	
	triangle(a,b,c);
	triangle(a,c,d);
	triangle(b,a,e);	
	triangle(a,d,e);	
	triangle(c,b,e);	
	triangle(d,c,e);
	new_object();	
	
	var after = num_vertices;
	object_index.push(vec2(start,after));
	start = after;
	
	pyramid_outline(a,b,c,d,e);
	after = num_vertices;
	object_index.push(vec2(start,after));
}

function pyramid_outline(a,b,c,d,e){
	lines(a,b);
	lines(b,c);
	lines(c,d);
	lines(d,a);
	lines(a,e);
	lines(b,e);
	lines(c,e);
	lines(d,e);	
	new_object();
}

function moveMatrixModel(ind){
	ModelViewMatrix[ind] = mat4();
	ModelViewMatrix[ind] = mult(ModelViewMatrix[ind], translate(dx[ind],-dy[ind], dz[ind]));
	ModelViewMatrix[ind] = mult(ModelViewMatrix[ind], rotate(theta[ind][xaxis],[1,0,0]));
	ModelViewMatrix[ind] = mult(ModelViewMatrix[ind], rotate(theta[ind][yaxis],[0,1,0]));
	ModelViewMatrix[ind] = mult(ModelViewMatrix[ind], rotate(theta[ind][zaxis],[0,0,1]));
	ModelViewMatrix[ind] = mult(ModelViewMatrix[ind], scale[ind]);
	//ModelViewMatrix[ind] = mult(ModelViewMatrix[0],ModelViewMatrix[ind]);
}

function moveObject(event){
	var kx = (right - left); var ky = ytop - bottom;
	var x = kx*event.clientX/canvas.width - dx[n]; var y = ky*event.clientY/canvas.height-dy[n];
	var xf, yf;
	function mouseMove(event){
		xf = kx*event.clientX/canvas.width; yf = ky*event.clientY/canvas.height;
		dx[n] = xf - x; dy[n] = yf - y;
	}	
	canvas.addEventListener("mousemove",mouseMove);
	
	canvas.addEventListener("mouseup",function (event){
			canvas.removeEventListener("mousemove",mouseMove);
		});	
}

function RotateObject(event){
	var key = String.fromCharCode(event.keyCode);
	//console.log(key);
	switch (key){
		// Rotating the Figure:
		case 'W':
			theta[n][xaxis] += -dr;
			break;
		case 'S':
			theta[n][xaxis] += dr;
			break;
		case 'A':
			theta[n][yaxis] += -dr;
			break;
		case 'D':
			theta[n][yaxis] += dr;
			break;
		case 'Q':
			theta[n][zaxis] += -dr;
			break;
		case 'E':
			theta[n][zaxis] += dr;
			break;
		// Scaling the Figure:
		case "'":
			scale[n][3][3] -= 0.1;
			break;
		case '%':
			scale[n][3][3] += 0.1;
			break;
		// Changing the Depth of the object:
		case "&":
			dz[n] += 0.1;
			break;
		case '(':
			dz[n] -= 0.1;
			break;
		
		default: console.log("A Mistake Happened Somewhere: you probably hit an invalid key...");
	}
}

function prep_buffers(ind){
	gl.bindBuffer(gl.ARRAY_BUFFER, cbuffer);
	gl.bufferData(gl.ARRAY_BUFFER,flatten(colorsArray[ind]), gl.STATIC_DRAW);
	
	gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0 , 0);
	gl.enableVertexAttribArray(vColor);

	gl.bindBuffer(gl.ARRAY_BUFFER, vbuffer);
	gl.bufferData(gl.ARRAY_BUFFER,flatten(verticesArray[ind]), gl.STATIC_DRAW);
	
	gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0 , 0);
	gl.enableVertexAttribArray(vPosition);
	
	gl.bindBuffer(gl.ARRAY_BUFFER, nbuffer);
	gl.bufferData(gl.ARRAY_BUFFER,flatten(normalArray[ind]), gl.STATIC_DRAW);

	gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0 , 0);
	gl.enableVertexAttribArray(vNormal);
	
	gl.bindBuffer(gl.ARRAY_BUFFER, texbuffer);
	gl.bufferData(gl.ARRAY_BUFFER,flatten(texCoordArray[ind]), gl.STATIC_DRAW);

	gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0 , 0);
	gl.enableVertexAttribArray(aTexCoord);
}
	
function new_object(){
	ModelViewMatrix.push(mat4());
	WorldMatrix = ModelViewMatrix[0];
	theta.push(vec3());
	scale.push(mat4());
	dx.push(0); dy.push(0); dz.push(0);
	
	verticesArray.push(temp_verticesArray);
	colorsArray.push(temp_colorsArray);
	normalArray.push(temp_normalArray);
	texCoordArray.push(temp_texCoordArray);
	
	temp_verticesArray = [];
	temp_colorsArray = [];	
	temp_normalArray = [];
	temp_texCoordArray = [];
	num_objects += 1; // Possibly needs to be modified
}

function init_arrays(){
	ModelViewMatrix.push(mat4()); 
	theta.push(vec3());
	scale.push(mat4());
	dx.push(0); dy.push(0); dz.push(0);
	
	verticesArray.push(vec3(0,0,0));
	colorsArray.push(vec4(0,0,0,0));
	object_index.push(vec2(0,1));
	normalArray.push(vec3(0,0,0));
	texCoordArray.push(vec2(0,0));
	
	num_vertices += 1;	
	prep_buffers(0);	
	gl.drawArrays(gl.POINTS, 0, 1)
}
  
function LightCalculations(){
	ambientProduct = mult(lightAmbient,materialAmbient);
	diffuseProduct = mult(lightDiffuse,materialDiffuse);
	specularProduct = mult(lightSpecular, materialSpecular);

	// Pass Values back to shader:
	gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"),
		flatten(ambientProduct));
	gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"),
		flatten(diffuseProduct) );
	gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), 
		flatten(specularProduct) );	
	gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), 
		flatten(lightPosition) );
	gl.uniform1f(gl.getUniformLocation(program, 
		"shininess"),materialShininess);
}

function changeColor(){ // Work In Progress
	var start = object_index[n][0]; var end = object_index[n][1];
	
	console.log(end-start);
}

function buttonHandler(){ // Work In Progress - Features and buttons still to be added
	colorButtons();
	document.getElementById("obj").addEventListener("click",function(event){
		window.removeEventListener("keydown",RotateObject);
	});

	document.getElementById("sub").addEventListener("click",function(event){
		n = document.getElementById("obj").value;
		n = Number(n);
		if (n > num_objects/2) {n = num_objects/2;}
		else if(n < 1) {n = 1;}
		else if(isNaN(n)) {n = 0;}
		n = 2*(n)-1;
		document.getElementById("obj").value = (n+1)/2;
		window.addEventListener("keydown",RotateObject);/***/
	});

	document.getElementById("pyr").addEventListener("click",function(event){
		pyramid(vec3(0,0,0),0.5,0.5,0.5);
		document.getElementById("num").innerHTML = num_objects/2;
		n = num_objects/2;
		n = 2*n-1;
		document.getElementById("obj").value = (n+1)/2;
	});

	var temp = 0; // For Testing Only
	document.getElementById("all").addEventListener("click",function(event){
		move_all = !move_all;
		if(move_all){
			n=0;
			document.getElementById("obj").value = "All";

		}
		else{
			n = document.getElementById("obj").value;
			n = Number(n)+1;
			if (n > num_objects/2+1) {n = num_objects/2;}
			else if(n < 0) {n = 0;}
			else if(isNaN(n)) {n = 0;}
			document.getElementById("obj").value = n-1;
			
			var j;
			for(i = 0; i < num_objects;++i){
				j = i+1;
				ModelViewMatrix[j] = mult(ModelViewMatrix[0],ModelViewMatrix[j]);
				ModelViewMatrix[0] = mat4();
			}
		}
		/*temp.push(vec3(0,0,0));
		temp.push(vec2(0,0));
		console.log(temp);
		/**/
	});
}

function colorButtons(){ // Work In Progress
	document.getElementById("red").addEventListener("click",function(event){
		document.getElementById("cColor").innerHTML = "Red";	
		color_index = 0;
	});
	document.getElementById("green").addEventListener("click",function(event){
		color_index = 1;
		document.getElementById("cColor").innerHTML = "Green";	
	});
	document.getElementById("blue").addEventListener("click",function(event){
		color_index = 2;
		document.getElementById("cColor").innerHTML = "Blue";	
	});
	document.getElementById("black").addEventListener("click",function(event){
		color_index = 3;
		document.getElementById("cColor").innerHTML = "Black";	
	});
	document.getElementById("white").addEventListener("click",function(event){
		color_index = 4;
		document.getElementById("cColor").innerHTML = "White";	
	});
	document.getElementById("yellow").addEventListener("click",function(event){
		color_index = 5;	
		document.getElementById("cColor").innerHTML = "Yellow";	
	});
	document.getElementById("magenta").addEventListener("click",function(event){
		color_index = 6;
		document.getElementById("cColor").innerHTML = "Magenta";	
	});
	document.getElementById("cyan").addEventListener("click",function(event){
		color_index = 7;
		document.getElementById("cColor").innerHTML = "cyan";	
	});
	if (n > 0){
		changeColor();		
	} 

}

function createTexture(){
	var image1 = new Array()
    for (var i =0; i<texSize; i++)  {
		image1[i] = new Array();
	}
    for (var i =0; i<texSize; i++) 
        for ( var j = 0; j < texSize; j++) 
           image1[i][j] = new Float32Array(4);
    for (var i =0; i<texSize; i++) 
		for (var j=0; j<texSize; j++) {
        var c = (((i & 0x8) == 0) ^ ((j & 0x8)  == 0));
        image1[i][j] = [c, c, c, 1];
    }
	// Convert floats to ubytes for texture
	var image2 = new Uint8Array(4*texSize*texSize);

    for ( var i = 0; i < texSize; i++ ) 
        for ( var j = 0; j < texSize; j++ ) 
           for(var k =0; k<4; k++) 
                image2[4*texSize*i+4*j+k] = 255*image1[i][j][k];	
				
	configureTexture(image2);
}

function configureTexture(image) {
    texture = gl.createTexture();
    gl.activeTexture( gl.TEXTURE0 );
    gl.bindTexture( gl.TEXTURE_2D, texture );
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0, 
        gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap( gl.TEXTURE_2D );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, 
        gl.NEAREST_MIPMAP_LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
}

	