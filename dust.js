/**
 * Author: Garald Seip
 * Fall 2022
 * CSC 3210
 * 
 * This file implements 
 */

import * as THREE from "http://cs.merrimack.edu/~stuetzlec/three.js-master/build/three.module.js";

class Particles
{
    constructor(count)
    {
        this.geometry = new THREE.OctahedronGeometry(1, 1);
        this.material = new THREE.MeshPhongMaterial({color: 0xd2b48c});

        this.particles = new THREE.InstancedMesh(this.geometry, this.material, count);
    }
}

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

        this.particles = new Particles(1000);

        this.scene.add(this.particles.particles);
    }
}

export {ParticleSimulator};