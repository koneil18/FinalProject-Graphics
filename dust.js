/**
 * Author: Garald Seip
 * Fall 2022
 * CSC 3210
 * 
 * This file implements 
 */

 import * as THREE from "http://cs.merrimack.edu/~stuetzlec/three.js-master/build/three.module.js";

 class ParticleSimulator
 {
    /**
     * The constructor takes in the scene and the camera in order to be able tocreate a list of every non-camera object in 
     * the scene.
     * 
     * @param {Scene} scene The scene of the program.
     * @param {Camera} camera The camera that the scene uses.
     */
    constructor(scene, camera)
    {
        this.scene = scene;
        this.camera = camera;
    }
 }

 export {ParticleSimulator};