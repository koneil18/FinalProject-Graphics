/**
 * Author: Garald Seip
 * Fall 2022
 * CSC 3210
 * 
 * This file implements the particle system for the project. 
 */

import * as THREE from "three";

/**
 * This class implements a single particle in the system and operations to update it.
 */
class Particle
{
    /**
     * This constructor takes in the scene and sets up the particle's mesh, direction, and speed.
     * 
     * @param {Scene} scene The scene of the program.
     */
    constructor(scene)
    {
        // The particle is created.
        this.geometry = new THREE.OctahedronGeometry(0.02, 2);
        this.material = new THREE.MeshPhongMaterial({color: 0xd2b48c});

        // Testing code.
        // this.geometry = new THREE.OctahedronGeometry(0.2, 2);
        // this.material = new THREE.MeshPhongMaterial({color: 'blue'});

        // The mesh is created and added to the scene.
        this.mesh = new THREE.Mesh(this.geometry.clone(), this.material.clone());
        scene.add(this.mesh);

        // A random direction is chosen.
        this.direction = (new THREE.Vector3(Math.random() * this.posOrNeg(), Math.random() * this.posOrNeg(), 
                                            Math.random() * this.posOrNeg())).normalize();

        // A random speed is chosen.
        var maxSpeed = 0.35;
        var minSpeed = 0.25;
        this.speed = this.random(minSpeed, maxSpeed);

        // tmpSpeed stores temporary speed modifiers that decay to decayRate% per frame.
        this.tmpSpeed = 0;
        this.decayRate = 0.9835;
    }

    /**
     * This function randomly sets the position of the particle within the specified bounds.
     * 
     * @param {Box3} bounds A bounding box that specifies the bounds of the program.
     */
    randomizeLocation(bounds)
    {
        this.mesh.position.setX(this.random(bounds.min.x, bounds.max.x));
        this.mesh.position.setY(this.random(bounds.min.y, bounds.max.y));
        this.mesh.position.setZ(this.random(bounds.min.z, bounds.max.z));
    }

    /**
     * This function randomly returns 1 or -1.
     * 
     * @returns 1 or -1.
     */
    posOrNeg()
    {
        return 1 - Math.floor(Math.random() * 2) * 2;
    }

    /**
     * This function returns a random number in [min, max)
     * 
     * @param {Number} min The minimum inclusive value.
     * @param {Number} max The maximum exclusive value.
     * @returns A number in [min, max) is returned.
     */
    random(min, max)
    {
        return Math.random() * (max - min) + min;
    }

    /**
     * This function is responsible for updating particles per timestep.
     * 
     * @param {Number} delta The time since the last frame.
     * @param {Box3} bounds A bounding box that specifies the bounds of the program.
     * @param {[Mesh, Mesh, ...]} objArray The array of objects in the scene.
     */
    update(delta, bounds, objArray)
    {
        // Advances the mesh forward along its direction.
        this.mesh.translateOnAxis(this.direction, (this.speed + this.tmpSpeed) * delta);
        // Decays the tmpSpeed.
        this.tmpSpeed *= this.decayRate;

        // Handles rebounding off the bounds of the program or colliding with objects in the program.
        this.rebound(this.mesh.position, bounds);
        this.collide(this.mesh.position, objArray);
        
        // Randomly adjusts direction to simulate minor air currents.
        this.direction.add(new THREE.Vector3(this.posOrNeg() * Math.random() / 10, 
                                             this.posOrNeg() * Math.random() / 10, 
                                             this.posOrNeg() * Math.random() / 10));

        // Normalizes the direction.
        this.direction.normalize();
    }

    /**
     * This function handles rebounding off the bounds of the program.
     * 
     * @param {Vector3} point The current position of the particle.
     * @param {Box3} bounds A bounding box that specifies the bounds of the program.
     */
    rebound(point, bounds)
    {
        // Uses short variable names to keep code compact.
        var dir = this.direction;
        var max = bounds.max;
        var min = bounds.min;

        // If the particle is outide the lengthwise horizontal bounds of the program and is continuing outward.
        if((point.x >= max.x && dir.x >= 0 || point.x <= min.x && dir.x <= 0))
            dir.x *= -1;

        // If the particle is outide the vertical bounds of the program and is continuing outward.
        if((point.y >= max.y && dir.y >= 0 || point.y <= min.y && dir.y <= 0))
            dir.y *= -1;

        // If the particle is outide the depthwise horizontal bounds of the program and is continuing outward.
        if((point.z >= max.z && dir.z >= 0 || point.z <= min.z && dir.z <= 0))
            dir.z *= -1;
    }

    /**
     * This function handles particles bouncing off of the objects in the scene.
     * 
     * @param {Vector3} point The current position of the particle.
     * @param {[Mesh, Mesh, ...]} objArray The array of objects in the scene.
     */
    collide(point, objArray)
    {
        var dir = this.direction;
        
        // WIll hold the current bounding box and sphere of the object used at a given loop.
        var bBox;
        var bSphere;
        
        // Which directions are to be bounced.
        var bounceDir = [false, false, false];
        
        // Checks the current particle against each object in the array.
        for(var i = 0; i < objArray.length; i++)
        {
            bBox = objArray[i].geometry.boundingBox;
            
            bSphere = objArray[i].geometry.boundingSphere;            

            // Checks to see if the point is in both the bounding box and the bounding sphere. This is done to
            // account for circular objects.
            if(bBox.containsPoint(point) && bSphere.containsPoint(point))
            {
                // These if statements determine if the particle is heading toward the center of the object.
                // If it is, then the appropriate directions are set to be bounced.
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

                // If multiple directions are set to be bounced, determines which single one is the most appropriate to bounce.
                if(bounceDir.filter(element => element).length > 1)
                {
                    // ratioVector stores the ratio of the actual sides to the bBox to if the bBox was a cube.
                    var ratioVector = this.getBBoxRatio(bBox);
                    // Temporarily move the point to the center of the sphere.
                    var centerOffset = new THREE.Vector3().sub(bSphere.center);
                    point.add(centerOffset);

                    // Calculates the distances from the point to the center of the box as if the box was a cube.
                    var xDist = Math.abs(point.x / ratioVector.x - bSphere.center.x);
                    var yDist = Math.abs(point.y / ratioVector.y - bSphere.center.y);
                    var zDist = Math.abs(point.z / ratioVector.z - bSphere.center.z);

                    // console.log("x: " + xDist + ", y: " + yDist + ", z: " + zDist);
                    // Moves the point back to its original location.
                    point.sub(centerOffset);
                    // console.log(bounceDir);

                    // Determines the direction to bounce based on the greatest distance.
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

                // Bounces the particle in the appropriate direction.
                if(bounceDir[0])
                    dir.x *= -1;
                else if(bounceDir[1])
                    dir.y *= -1;
                else if(bounceDir[2])
                    dir.z *= -1;
            }
        }
    }

    /**
     * This function gets the ratio of the bBox's sides to if they were the sides on a cube.
     * 
     * @param {Box3} bBox 
     * @returns A Vector3 is returned with each xyz value being in (0, 1].
     */
    getBBoxRatio(bBox)
    {
        // The dimensions of the bBox.
        var width = bBox.max.x - bBox.min.x;
        var height = bBox.max.y - bBox.min.y;
        var depth = bBox.max.z - bBox.min.z;

        // ratio will store the ratios of each side.
        var ratio = new THREE.Vector3();

        // Determines the length of the longest side.
        var longestSide = [width, height, depth].sort(function(a, b){return a - b})[2];

        // Sets the ratios of each side
        ratio.set(width / longestSide, height / longestSide, depth / longestSide);
        return ratio;
    }

    /**
     * This function gradually pushes particles away from the center of the bounding sphere.
     * 
     * @param {Sphere} bSphere The sphere to move particles away from.
     */
    moveAwayFrom(bSphere)
    {
        // changeVector stores the offset between the particle and the center of the sphere. Will be added to the particle's
        // current direction.
        var changeVector = this.mesh.position.clone().sub(bSphere.center);
        // speedMult stores the value to multiply the length of the new direction vector by and the temporary speed.
        // speedMult's equation was determined by using DESMOS, FYI.
        var speedMult = (0.3 - Math.log(changeVector.length()) / 5);

        // Ensures that the speedMult is in bounds.
        if(speedMult < 0.001)
            speedMult = 0.001;
        else if(speedMult > 5)
            speedMult = 5;
        
        // Normalizes the vector.
        changeVector.normalize();

        // Adds the changeVector to the current direction, and speedMult to the tmpSpeed.
        this.direction.add(changeVector.multiplyScalar(speedMult));
        this.tmpSpeed += speedMult;
    }
}

/**
 * This class handles creating the particles and updating them each frame.
 */
class ParticleSimulator
{
    /**
     * The constructor takes in the scene and the camera in order to be able to create a list of every non-camera object in 
     * the scene.
     * 
     * @param {Scene} scene The scene of the program.
     * @param {Box3} bounds The bounds of the dust.
     * @param {[Mesh, Mesh, ...]} objArray The array of objects in the scene.
     * @param {BurstHandler} burstHandler The handler for air bursts.
     */
    constructor(scene, bounds, objArray, burstHandler)
    {
        // Stores the passed arguments.
        this.scene = scene;
        this.bounds = bounds;
        this.objArray = objArray;
        this.burstHandler = burstHandler;

        // count stores the number of particles to create.
        this.count = 10000;

        // Creates bounding boxes and bounding spheres for every object in the object array.
        for(var i = 0; i < objArray.length; i++)
        {
            var obj = objArray[i];
            var offset = obj.position.clone().sub(new THREE.Vector3(0, 0, 0));
            
            obj.geometry.computeBoundingBox();
            obj.geometry.boundingBox.max.y += .05;
            // scene.add(new THREE.BoxHelper(obj, 0xffff00));
            obj.geometry.boundingBox.translate(offset);

            obj.geometry.computeBoundingSphere();
            obj.geometry.boundingSphere.center.add(offset);
        }

        // particles stores the particles as an array.
        this.particles = [];

        // Creates the particles and moves them to random positions.
        for(var i = 0; i < this.count; i++)
        {
            this.particles.push(new Particle(scene));
            this.particles[i].randomizeLocation(this.bounds);
        }

        // Code for testing.
        // this.particles.push(new Particle(scene, bounds, objArray));
        
        // this.particles[0].mesh.position.set(-2.5, 0.5, -2.5);
        // this.particles[0].direction.set(1, 0, -1);
        // this.particles[0].direction.normalize();
        // this.particles[0].speed = 0.025;
    }

    /**
     * This function handles updating all the particles in the scene per frame.
     * 
     * @param {Number} delta The time since the last frame.
     */
    update(delta)
    {
        var currBursts = this.burstHandler.getBursts();

        // Updates every particle in the array.
        for(var i = 0; i < this.particles.length; i++)
        {
            this.particles[i].update(delta, this.bounds, this.objArray);

            for(var j = 0; j < currBursts.length; j++)
            {
                if(currBursts[j].containsPoint(this.particles[i].mesh.position))
                    this.particles[i].moveAwayFrom(currBursts[j]);
            }
        }
    }
}

/**
 * This class manages bursts of air that occur when a piece is captured.
 */
class BurstHandler
{
    /**
     * The constructor creates the map, sets the time limit of each burst, and the radius of each burst.
     * 
     * @param {Number} timeLimit The time in millesconds each burst should last. 
     * @param {Number} radius How large each burst should be.
     */
    constructor(timeLimit=500, radius=10)
    {
        // activeBursts stores bounding spheres as keys and creation time in milliseconds as values.
        this.activeBursts = new Map();
        this.timeLimit = timeLimit;
        this.radius = radius;
    }

    /**
     * This function adds a burst centered at the specified location.
     * 
     * @param {Vector3} loc The center of the new burst.
     */
    add(loc)
    {
        this.activeBursts.set(new THREE.Sphere(loc, this.radius), performance.now());
    }

    /**
     * This function returns an array of the active bursts in the map.
     * 
     * @returns An array containg the active bounding spheres representing the bursts is returned.
     */
    getBursts()
    {
        var retList = [];

        var iterator = this.activeBursts.keys();
        var currEntry = iterator.next().value;

        while(currEntry != undefined)
        {
            retList.push(currEntry);
            currEntry = iterator.next().value;
        }
    
        return retList;
    }

    /**
     * This function handles removing bursts from the map if they have expired.
     */
    update()
    {
        var iterator = this.activeBursts.entries();
        var currEntry = iterator.next().value;

        while(currEntry != undefined)
        {
            if(performance.now() - currEntry[1] >= this.timeLimit)
                this.activeBursts.delete(currEntry[0]);

            currEntry = iterator.next().value;
        }          
    }
}

export {ParticleSimulator, BurstHandler};