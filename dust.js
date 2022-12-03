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
    constructor(scene, count, bounds)
    {
        this.scene = scene;
        this.bounds = bounds;

        this.geometry = new THREE.OctahedronGeometry(0.02, 2);
        this.material = new THREE.MeshPhongMaterial({color: 0xd2b48c});

        this.particles = [];        
        this.directions = [];
        this.speeds = [];

        var maxSpeed = 0.05;
        var minSpeed = 0.025;

        for(var i = 0; i < count; i++)
        {
            this.particles.push(new THREE.Mesh(this.geometry.clone(), this.material.clone()));
            scene.add(this.particles[i]);

            this.directions.push((new THREE.Vector3(Math.random() * this.posOrNeg(), Math.random() * this.posOrNeg(), 
                                                    Math.random() * this.posOrNeg())).normalize());
            this.speeds.push(this.random(maxSpeed, minSpeed));
        }

        for(var i = 0; i < this.particles.length; i++)
        {
            this.particles[i].position.setX(this.random(bounds.min.x, bounds.max.x));
            this.particles[i].position.setY(this.random(0, bounds.max.y));
            this.particles[i].position.setZ(this.random(bounds.min.z, bounds.max.z));
        }
    }

    posOrNeg()
    {
        return 1 - Math.floor(Math.random() * 2) * 2;
    }

    random(min, max)
    {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    update(delta)
    {
        for(var i = 0; i < this.particles.length; i++)
        {
            this.particles[i].translateOnAxis(this.directions[i], this.speeds[i] * delta);
            this.directions[i].add(new THREE.Vector3(this.posOrNeg() * Math.random() / 10, this.posOrNeg() * Math.random() / 10, this.posOrNeg() * Math.random() / 10));
            this.rebound(this.particles[i].position, i);
        }
    }

    rebound(point, index)
    {
        var dir = this.directions[index];
        var max = this.bounds.max;
        var min = this.bounds.min;

        if((point.x >= max.x && dir.x >= 0 || point.x <= min.x && dir.x <= 0))
            dir.x *= -1;
        if((point.y >= max.y && dir.y >= 0 || point.y <= min.y && dir.y <= 0))
            dir.y *= -1;
        if((point.z >= max.z && dir.z >= 0 || point.z <= min.z && dir.z <= 0))
            dir.z *= -1;

        
    }
}

class ParticleSimulator
{
    /**
     * The constructor takes in the scene and the camera in order to be able to create a list of every non-camera object in 
     * the scene.
     * 
     * @param {Scene} scene The scene of the program.
     * @param {[Mesh, Mesh, ...]} objArray The array of objects in the scene.
     * @param {Box3} bounds The bounds of the dust.
     */
    constructor(scene, camera, bounds)
    {
        this.scene = scene;
        this.camera = camera;
        this.bounds = bounds;

        this.particles = new Particles(scene, 1000, bounds);
    }

    update(delta)
    {
        this.particles.update(delta);
    }
}

export {ParticleSimulator};