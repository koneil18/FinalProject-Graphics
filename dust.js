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

        // this.geometry = new THREE.OctahedronGeometry(0.02, 2);
        // this.material = new THREE.MeshPhongMaterial({color: 0xd2b48c});

        this.geometry = new THREE.OctahedronGeometry(0.2, 2);
        this.material = new THREE.MeshPhongMaterial({color: 'blue'});

        this.mesh = new THREE.Mesh(this.geometry.clone(), this.material.clone());
        scene.add(this.mesh);

        this.direction = (new THREE.Vector3(Math.random() * this.posOrNeg(), Math.random() * this.posOrNeg(), 
                                            Math.random() * this.posOrNeg())).normalize();

        var maxSpeed = 0.035;
        var minSpeed = 0.025;
        this.speed = this.random(minSpeed, maxSpeed);

        this.tmpSpeed = 0;
        this.decayRate = 0.9835;
    }

    randomizeLocation(bounds)
    {
        this.mesh.position.setX(this.random(bounds.min.x, bounds.max.x));
        this.mesh.position.setY(this.random(0, bounds.max.y));
        this.mesh.position.setZ(this.random(bounds.min.z, bounds.max.z));
    }

    posOrNeg()
    {
        return 1 - Math.floor(Math.random() * 2) * 2;
    }

    random(min, max)
    {
        return (Math.random() * (max - min + 1)) + min;
    }

    update(delta, bounds, objArray)
    {
        this.mesh.translateOnAxis(this.direction, (this.speed + this.tmpSpeed) * delta);
        this.tmpSpeed *= this.decayRate;

        this.rebound(this.mesh.position, bounds);
        this.collide(this.mesh.position, objArray);
        
        this.direction.add(new THREE.Vector3(this.posOrNeg() * Math.random() / 10, 
                                             this.posOrNeg() * Math.random() / 10, 
                                             this.posOrNeg() * Math.random() / 10));

        this.direction.normalize();
    }

    rebound(point, bounds)
    {
        var dir = this.direction;
        var max = bounds.max;
        var min = bounds.min;

        if((point.x >= max.x && dir.x >= 0 || point.x <= min.x && dir.x <= 0))
            dir.x *= -1;
        if((point.y >= max.y && dir.y >= 0 || point.y <= min.y && dir.y <= 0))
            dir.y *= -1;
        if((point.z >= max.z && dir.z >= 0 || point.z <= min.z && dir.z <= 0))
            dir.z *= -1;
    }

    collide(point, objArray)
    {
        var dir = this.direction;
        
        var bBox;
        var bSphere;
        
        var bounceDir = [false, false, false];
        
        for(var i = 0; i < objArray.length; i++)
        {
            bBox = objArray[i].geometry.boundingBox;
            
            bSphere = objArray[i].geometry.boundingSphere;            

            if(bBox.containsPoint(point) && bSphere.containsPoint(point))
            {
                if((point.x >= bSphere.center.x && dir.x <= 0 || point.x <= bSphere.center.x && dir.x >= 0))
                {
                    bounceDir[0] = true;
                }
                if((point.y >= bSphere.center.y && dir.y <= 0 || point.y <= bSphere.center.y && dir.y >= 0))
                {    
                    bounceDir[1] = true;
                }
                if((point.z >= bSphere.center.z && dir.z <= 0 || point.z <= bSphere.center.z && dir.z >= 0))
                {
                    bounceDir[2] = true;
                }

                if(bounceDir.filter(element => element).length > 1)
                {
                    var ratioVector = this.getBBoxRatio(bBox);
                    var centerOffset = new THREE.Vector3().sub(bSphere.center);
                    point.add(centerOffset);

                    var xDist = Math.abs(point.x / ratioVector.x - bSphere.center.x);
                    var yDist = Math.abs(point.y / ratioVector.y - bSphere.center.y);
                    var zDist = Math.abs(point.z / ratioVector.z - bSphere.center.z);

                    // console.log("x: " + xDist + ", y: " + yDist + ", z: " + zDist);

                    point.sub(centerOffset);
                    // console.log(bounceDir);

                    if(xDist > yDist && xDist > zDist && bounceDir[0])
                    {
                        bounceDir[1] = false;
                        bounceDir[2] = false;
                    }
                    else if(yDist > xDist && yDist > zDist && bounceDir[1])
                    {
                        bounceDir[0] = false;
                        bounceDir[2] = false;
                    }
                    else if(bounceDir[2])
                    {
                        bounceDir[0] = false;
                        bounceDir[1] = false;
                    }

                    // console.log(bounceDir);
                }

                if(bounceDir[0])
                    dir.x *= -1;
                else if(bounceDir[1])
                    dir.y *= -1;
                else if(bounceDir[2])
                    dir.z *= -1;
            }
        }
    }

    getBBoxRatio(bBox)
    {
        var width = bBox.max.x - bBox.min.x;
        var height = bBox.max.y - bBox.min.y;
        var depth = bBox.max.z - bBox.min.z;

        var ratio = new THREE.Vector3();

        var longestSide = [width, height, depth].sort(function(a, b){return a - b})[2];

        ratio.set(width / longestSide, height / longestSide, depth / longestSide);
        return ratio;
    }

    moveAwayFrom(bSphere)
    {
        var speedMult = Math.log(bSphere.center.clone().sub(this.mesh.position).length());
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
            obj.geometry.boundingBox.max.y += .05;
            scene.add(new THREE.BoxHelper(obj, 0xffff00));
            obj.geometry.boundingBox.translate(offset);

            obj.geometry.computeBoundingSphere();
            obj.geometry.boundingSphere.center.add(offset);
        }

        this.particles = [];

        // for(var i = 0; i < this.count; i++)
        // {
        //     this.particles.push(new Particle(scene, bounds, objArray));
        //     this.particles[i].randomizeLocation(this.bounds);
        // }

        this.particles.push(new Particle(scene, bounds, objArray));
        
        this.particles[0].mesh.position.set(-2.5, 0.5, -2.5);
        this.particles[0].direction.set(1, 0, -1);
        this.particles[0].direction.normalize();
        this.particles[0].speed = 0.05;
    }

    update(delta)
    {
        for(var i = 0; i < this.particles.length; i++)
        {
            this.particles[i].update(delta, this.bounds, this.objArray);
        }
    }
}

export {ParticleSimulator};