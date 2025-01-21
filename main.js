import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";

import { CustomOutlinePass } from "./CustomOutlinePass.js";
import FindSurfaces from "./FindSurfaces.js";



const scene = new THREE.Scene();
scene.background = new THREE.Color("rgb(75, 75, 75)");
const renderer = new THREE.WebGLRenderer({canvas: document.querySelector('canvas')});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth / 2, window.innerHeight / 2)

//red to orange = z(blue)
//blue to green = x(red)
//white to yellow = y(green)
// const axesHelper = new THREE.AxesHelper( 25 );
// scene.add( axesHelper );


const camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.1, 1000 ); 
camera.updateProjectionMatrix();
const controls = new OrbitControls(camera, renderer.domElement);
controls.maxDistance = 20;
controls.minDistance = 20;
controls.enableDamping = true;
controls.dampingFactor = 0.1;
controls.mouseButtons= {
    RIGHT: THREE.MOUSE.ROTATE
}

camera.position.z = 20;

const CUBESIZE =2;
const SPACING = 0.5;
const DIMENSIONS = 3;


// const cube = new THREE.Mesh( geometry, material ); 
// scene.add(cube); 

var increment = CUBESIZE + SPACING
var allCubes = [];


const geometry = new THREE.BoxGeometry( CUBESIZE, CUBESIZE, CUBESIZE); 

//(z):Blue/Green (y):Yellow/White (x):Orange/Red
var colors = [0x0a78ff, 0x05e639, 0xffeb52, 0xFFFFFF, 0xfc7830, 0xc40014]
var black = new THREE.MeshBasicMaterial( { color: 0x000000 } )
var white = new THREE.MeshBasicMaterial( { color: 0xdbdbdb } )

function getAxisColours(val, posCol, negCol, innerCol) {
    if (val < 0) {return [innerCol, new THREE.MeshBasicMaterial( { color: negCol } )]}
    if (val > 0) {return [new THREE.MeshBasicMaterial( { color: posCol } ), innerCol]}
    return [innerCol, innerCol]
}

function createCubeMaterial(x,y,z,inner) {
    return [
        ...getAxisColours(x, colors[0], colors[1], inner), // x-axis
        ...getAxisColours(y, colors[2], colors[3], inner), // y-axis
        ...getAxisColours(z, colors[4], colors[5], inner)  // z-axis
    ]
}

function newCube(x,y,z) {
    let blackMat = createCubeMaterial(x,y,z,black)
    let whiteMat = createCubeMaterial(x,y,z,white)


    var cube = new THREE.Mesh(geometry, blackMat)
    cube.position.set(x,y,z)
    scene.add(cube)
    allCubes.push([cube, blackMat, whiteMat])
}

var positionOffset = (DIMENSIONS - 1) / 2;
for(var i=0; i<DIMENSIONS; i++){
    for(var j = 0; j < DIMENSIONS; j ++) {
        for(var k = 0; k < DIMENSIONS; k ++) {
            
            var x = (i-positionOffset) * increment
            var y = (j-positionOffset) * increment
            var z = (k-positionOffset) * increment

            if(!(x==0 && y==0 && z==0)){
                console.log(x,y,z)
                newCube(x,y,z)
            }
            
        }
    }
}

//Mouse Control

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function onPointerMove(event) {
    if(mouseCheck == false) {
        return
    }
    let canvasBounds = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - canvasBounds.left) / (canvasBounds.right - canvasBounds.left)) * 2 - 1;
    pointer.y = -((event.clientY - canvasBounds.top) / (canvasBounds.bottom - canvasBounds.top)) * 2 + 1;

}
window.addEventListener( 'pointermove', onPointerMove );


function onMouseClick(event) {
    if(mouseCheck == false) {
        return
    }

    if ("buttons" in event) {
        if (event.buttons != 1){
            return
        }
    }

    // rotateCubes()

    let rotVec = new THREE.Vector3(0,0,0)
    if(axis == "x"){rotVec.x = axisVal}
    if(axis == "y"){rotVec.y = axisVal}
    if(axis == "z"){rotVec.z = axisVal}
    rotVec.normalize()
    for (i=0;i<currentRotCubes.length;i++){
        currentRotCubes[i][0].position.applyMatrix4(new THREE.Matrix4().makeRotationAxis(rotVec, Math.PI/2))
        currentRotCubes[i][0].rotateOnWorldAxis(rotVec, Math.PI/2)
    }

}
window.addEventListener( "mousedown", onMouseClick);

let mouseCheck = false

var canvas = document.getElementById("canvas")
canvas.addEventListener("mouseover", mouseOnCanvas)
canvas.addEventListener("mouseleave", mouseOffCanvas)

function mouseOnCanvas() {
    mouseCheck = true;
}

function mouseOffCanvas() {
    mouseCheck = false;
}

//Post processing outlines and anti-aliasing

const depthTexture = new THREE.DepthTexture();
const renderTarget = new THREE.WebGLRenderTarget(
  window.innerWidth,
  window.innerHeight,
  {
    depthTexture: depthTexture,
    depthBuffer: true,
  }
);

const composer = new EffectComposer(renderer, renderTarget);
composer.setSize(window.innerWidth / 2, window.innerHeight / 2);
const renderPass = new RenderPass(scene,camera);
composer.addPass(renderPass);

const customOutline = new CustomOutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera);
composer.addPass(customOutline)


const effectFXAA = new ShaderPass(FXAAShader);
effectFXAA.uniforms["resolution"].value.set(
  1 / window.innerWidth,
  1 / window.innerHeight
);
composer.addPass(effectFXAA);


const surfaceFinder = new FindSurfaces();
surfaceFinder.surfaceId = 0;
scene.traverse((node) => {
    if (node.type == "Mesh") {
        const colorsTypedArray = surfaceFinder.getSurfaceIdAttribute(node);
        node.geometry.setAttribute("color", new THREE.BufferAttribute(colorsTypedArray, 4));
    }
});

customOutline.updateMaxSurfaceId(surfaceFinder.surfaceId + 1);

scene.rotation.x += 10;

let currentCube
const offset = CUBESIZE + SPACING

function getCubesOnAxis(axis, val){
    let selectedCubes = []

    for (i=0;i<allCubes.length;i++){
        if (axis == "x") {
            if (allCubes[i][0].position.x == val) {
                selectedCubes.push(allCubes[i])
                allCubes[i][0].material = allCubes[i][2]
            }
        }
        if (axis == "y") {
            if (allCubes[i][0].position.y == val) {
                selectedCubes.push(allCubes[i])
                allCubes[i][0].material = allCubes[i][2]
            }
        }
        if (axis == "z") {
            if (allCubes[i][0].position.z == val) {
                selectedCubes.push(allCubes[i])
                allCubes[i][0].material = allCubes[i][2]
            }
        }


    }
    return selectedCubes
}

// let rotationGroup = new THREE.Group();
// scene.add(rotationGroup)
// rotationGroup.position.set(0,0,0)

// function rotateCubes() {
//     rotationGroup.rotation.set(0,0,0);
//     rotationGroup.updateWorldMatrix();
//     for (i=0;i<currentRotCubes.length;i++){
//         rotationGroup.add(currentRotCubes[i][0])
//     }

//     if (axis = "x"){
//         new TWEEN.Tween(rotationGroup.rotation.x,true)
//             .to(Math.PI/2, 100)
//             .easing(TWEEN.Easing.Sinusoidal.InOut)
//             .start();
//     }
//     else if (axis = "y"){
//         new TWEEN.Tween(rotationGroup.rotation.y,true)
//             .to(Math.PI/2, 100)
//             .easing(TWEEN.Easing.Sinusoidal.InOut)
//             .start();
//     }
//     else{
//         new TWEEN.Tween(rotationGroup.rotation.z,true)
//             .to(Math.PI/2, 100)
//             .easing(TWEEN.Easing.Sinusoidal.InOut)
//             .start();
//     }
    
//     rotationGroup.remove(...rotationGroup.children)


// }

//Rendering and Rotation Control



let currentRotCubes
let previousCubes
let axis
let axisVal

function update() {
    if (mouseCheck==false){
        scene.rotation.y +=0.002;
    }

    if(currentRotCubes != previousCubes && previousCubes != null) {
        for(i=0;i<previousCubes.length;i++){
            previousCubes[i][0].material = previousCubes[i][1]
        }
    }

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(scene.children);

    if (intersects.length > 0) {
        currentCube = intersects[0].object
        let pos = currentCube.position
        let cubeType = Math.abs(pos.x) + Math.abs(pos.y) + Math.abs(pos.z)
        
        if (cubeType == offset){
            let keys = Object.keys(pos)
            for(i=0; i<keys.length;i++){
                if(pos[keys[i]] != 0) {
                    axis = keys[i]
                    axisVal = pos[axis]
                    previousCubes = currentRotCubes
                    currentRotCubes = getCubesOnAxis(axis,axisVal)
                }
            }
        }

    }
    requestAnimationFrame(update);
    composer.render();
}
update();


function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  
    renderer.setSize(window.innerWidth / 2, window.innerHeight / 2);
    composer.setSize(window.innerWidth / 2, window.innerHeight / 2);
}
window.addEventListener("resize", onWindowResize, false);

