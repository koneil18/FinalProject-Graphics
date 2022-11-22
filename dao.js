import * as THREE from "http://cs.merrimack.edu/~stuetzlec/three.js-master/build/three.module.js";

/**
 * A class for a single CheckerPiece.
 */
class CheckerPiece {
    /**
     * The geometry for each piece.
     */
    geometry = new THREE.CylinderGeometry(.4, .4, .2, 32);
    redTexture = new THREE.TextureLoader()
        .load('assets/pieces/red_checker_piece.png');
    blackTexture = new THREE.TextureLoader()
        .load('assets/pieces/black_checker_piece.png');
    materials = null;
    color = null;
    mesh = null;

    /**
     * Constructs a new Piece object of the specified color and moves it to the
     * specified starting position.
     * 
     * @param {String} color The color of the piece. Either 'red' or 'black'. 
     * @param {THREE.Vector3} position The position the piece should start at.
     * @param {THREE.Scene} scene The scene object to add the checker piece to.
     */
    constructor(color, position, scene) {
        this.color = color;
        this.buildPiece(scene, position);
    }

    get getColor() {
        return this.color;
    }

    /**
     * Builds a new checker geometry and adds it to the scene, moving it to the
     * specified position.
     * 
     * @param {THREE.Scene} scene The scene object to add the checker piece to.
     * @param {THREE.Vector3} position The position to move the checker piece to.
     */
    buildPiece(scene, position) {
        // Depending on the color of the checker, build the correct materials.
        this.materials = [
            // Side
            new THREE.MeshPhongMaterial({
                side: THREE.DoubleSide,
                color: (this.color == 'red') ? new THREE
                    .Color('rgb(208, 12, 24)') : new THREE
                    .Color('rgb(22, 22, 22')
            }),

            // Top
            new THREE.MeshPhongMaterial({
                side: THREE.DoubleSide,
                map: (this.color == 'red') ? this.redTexture : this
                    .blackTexture
            }),

            // Bottom
            new THREE.MeshPhongMaterial({
                side: THREE.DoubleSide,
                map: (this.color == 'red') ? this.redTexture : this
                    .blackTexture
            })
        ];

        this.mesh = new THREE.Mesh(this.geometry, this.materials);
        this.mesh.position.set(position.x, position.y, position.z);
        scene.add(this.mesh);
    }

    /**
     * Moves the checker piece to the specified position.
     * 
     * @param {THREE.Vector3} newPos The new position to move the piece to. 
     */
    movePosition(newPos) {
        // Probably need to tween here.
        this.mesh.position.set(newPos.x, newPos.y, newPos.z);
    }
}

/**
 * A class for the GameBoard, which holds the board itself, and the Pieces on
 * the board.
 */
class GameBoard {
    meshesArray = null;
    pieceKeeperArray = Array.from(Array(8), () => new Array(8));
    worldCoordinateToArrayIndexMap = {};
    scene = null;

    constructor(scene) {
        this.scene = scene;
        this.meshesArray = this.buildBoard();
        
        console.log(this.meshesArray);
        this.pieceKeeperArray = this.initPieces();
    }

    buildBoard() {
        const meshesArray = Array.from(Array(8), () => new Array(8));
        var fillRed = false;
        const geometry = new THREE.BoxGeometry(1, .03, 1);
        
        const group = new THREE.Group();
        const redWoodTexture = new THREE.TextureLoader()
            .load('assets/board/red_wood.jpg'), blackWoodTexture = new THREE
            .TextureLoader().load('assets/board/black_wood.jpg');
        var x = -4.5, y = 0, z = -3.5;
        for (var i = 0; i < 8; i++) {
            for (var j = 0; j < 8; j++) {
                x += 1;
                var currentPos = new THREE.Vector3(x, y, z);

                // This isn't working?
                this.worldCoordinateToArrayIndexMap[currentPos] = 
                    new Point(i, j);

                const material = new THREE.MeshPhongMaterial({
                    side: THREE.DoubleSide,
                    specular: 0x050505,
                    shininess: 100,
                    map: (fillRed) ? redWoodTexture : blackWoodTexture
                });
                fillRed = !fillRed;

                const mesh = new THREE.Mesh(geometry, material);
                meshesArray[i][j] = mesh;
                mesh.position.set(currentPos.x , currentPos.y, currentPos.z);
                group.add(mesh);
            }

            fillRed = !fillRed;
            x = -4.5;
            z += 1;
        }
        
        var woodGeometry = new THREE.BoxGeometry(8, .5, 8);
        var woodMaterial = new THREE.MeshPhongMaterial({
            side: THREE.DoubleSide,
            map: new THREE.TextureLoader().load('assets/board/walnut.jpg')
        });
        var woodMesh = new THREE.Mesh(woodGeometry, woodMaterial);
        woodMesh.position.y = -.26;
        group.add(woodMesh);
        this.scene.add(group);

        return meshesArray;
    }

    initPieces() {
        new CheckerPiece('red', new THREE.Vector3(-3.5, 0, 3.5), this.scene);
    }
}

class Point {
    constructor(x, y) {

    }
}

export { CheckerPiece, GameBoard };