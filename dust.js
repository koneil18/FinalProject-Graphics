/**
 * Author: Garald Seip
 * Fall 2022
 * CSC 3210
 * 
 * This file implements 
 */

import * as THREE from "http://cs.merrimack.edu/~stuetzlec/three.js-master/build/three.module.js";

class Particle
{
    constructor(scene, bounds, objArray)
    {
        this.scene = scene;
        this.bounds = bounds;
        this.objArray = objArray;
        
        this.collisionArray = [];

        this.geometry = new THREE.OctahedronGeometry(0.02 * 10, 2);
        this.material = new THREE.MeshPhongMaterial({color: /*0xd2b48c*/ 'blue'});

        this.mesh = new THREE.Mesh(this.geometry.clone(), this.material.clone());
        scene.add(this.mesh);

        this.direction = (new THREE.Vector3(Math.random() * this.posOrNeg(), Math.random() * this.posOrNeg(), 
                                            Math.random() * this.posOrNeg())).normalize();

        var maxSpeed = 0.035;
        var minSpeed = 0.015;
        this.speed = this.random(minSpeed, maxSpeed);
    }

    randomizeLocation()
    {
        this.mesh.position.setX(this.random(this.bounds.min.x, this.bounds.max.x));
        this.mesh.position.setY(this.random(0, this.bounds.max.y));
        this.mesh.position.setZ(this.random(this.bounds.min.z, this.bounds.max.z));
    }

    posOrNeg()
    {
        return 1 - Math.floor(Math.random() * 2) * 2;
    }

    random(min, max)
    {
        return (Math.random() * (max - min + 1)) + min;
    }

    update(delta)
    {
        this.mesh.translateOnAxis(this.direction, this.speed * delta);

        this.rebound(this.mesh.position);
        this.collide(this.mesh.position);
        
        // this.direction.add(new THREE.Vector3(this.posOrNeg() * Math.random() / 10, 
        //                                             this.posOrNeg() * Math.random() / 10, 
        //                                             this.posOrNeg() * Math.random() / 10));

        this.direction.normalize();
    }

    rebound(point)
    {
        var dir = this.direction;
        var max = this.bounds.max;
        var min = this.bounds.min;

        if((point.x >= max.x && dir.x >= 0 || point.x <= min.x && dir.x <= 0))
            dir.x *= -1;
        if((point.y >= max.y && dir.y >= 0 || point.y <= min.y && dir.y <= 0))
            dir.y *= -1;
        if((point.z >= max.z && dir.z >= 0 || point.z <= min.z && dir.z <= 0))
            dir.z *= -1;
    }

    collide(point)
    {
        var dir = this.direction;
        
        var bBox;
            
        var bSphere;

        for(var i = this.collisionArray.length - 1; i >= 0; i--)
            if(!this.collisionArray[i].containsPoint(point))
                this.collisionArray.splice(i, 1);

        for(var i = 0; i < this.objArray.length; i++)
        {
            var bounced = false;
            bBox = this.objArray[i].geometry.boundingBox;
            
            bSphere = this.objArray[i].geometry.boundingSphere;            

            if(this.collisionArray.indexOf(bBox) == -1 && bBox.containsPoint(point) && bSphere.containsPoint(point))
            {
                if((point.x >= bSphere.center.x && dir.x <= 0 || point.x <= bSphere.center.x && dir.x >= 0))
                {
                    dir.x *= -1;
                    //bounced = true;
                }
                if(!bounced && (point.y >= bSphere.center.y && dir.y <= 0 || point.y <= bSphere.center.y && dir.y >= 0))
                {    
                    dir.y *= -1;
                    //bounced = true;
                }
                if(!bounced && (point.z >= bSphere.center.z && dir.z <= 0 || point.z <= bSphere.center.z && dir.z >= 0))
                {
                    dir.z *= -1;
                    bounced = true;
                }

                // if(bounced)
                //     this.collisionArray.push(bBox);
            }
        }
    }
}

class ParticleSimulator
{
    /**
     * The constructor takes in the scene and the camera in order to be able to create a list of every non-camera object in 
     * the scene.
     * 
     * @param {Scene} scene The scene of the program.
     * @param {Box3} bounds The bounds of the dust.
     * @param {[Mesh, Mesh, ...]} objArray The array of objects in the scene.
     */
    constructor(scene, bounds, objArray)
    {
        this.scene = scene;
        this.bounds = bounds;
        this.objArray = objArray;
        this.count = 1000;

        for(var i = 0; i < objArray.length; i++)
        {
            var obj = objArray[i];
            var offset = obj.position.clone().sub(new THREE.Vector3(0, 0, 0));
            
            obj.geometry.computeBoundingBox();
            obj.geometry.boundingBox.min.add(offset);
            obj.geometry.boundingBox.max.add(offset);

            obj.geometry.computeBoundingSphere();
            obj.geometry.boundingSphere.center.add(offset);
        }

        this.particles = [];
        for(var i = 0; i < this.count; i++)
        {
            this.particles.push(new Particle(scene, bounds, objArray));
            this.particles[i].randomizeLocation();
        }
    }

    update(delta)
    {
        for(var i = 0; i < this.count; i++)
        {
            this.particles[i].update(delta);
            if(this.particles[i].collisionArray.length != 0)
                console.log(this.particles[i].collisionArray.length);
        }
        
    }
}

export {ParticleSimulator};