import * as THREE from "http://cs.merrimack.edu/~stuetzlec/three.js-master/build/three.module.js";

const redTexture = new THREE.TextureLoader()
    .load('assets/pieces/red_checker_piece.png');
const blackTexture = new THREE.TextureLoader()
    .load('assets/pieces/black_checker_piece.png');

/**
 * A class for a single CheckerPiece.
 */
class CheckerPiece {
    /**
     * The geometry for each piece.
     */
    geometry = new THREE.CylinderGeometry(.4, .4, .1, 32);
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
                    .Color('rgb(22, 22, 22)')
            }),

            // Top
            new THREE.MeshPhongMaterial({
                side: THREE.DoubleSide,
                map: (this.color == 'red') ? redTexture : blackTexture
            }),

            // Bottom
            new THREE.MeshPhongMaterial({
                side: THREE.DoubleSide,
                map: (this.color == 'red') ? redTexture : blackTexture
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
    pieceKeeperArray = Array.from(Array(8), () => new Array(8));
    tilesArray = null
    worldCoordinateToArrayIndexMap = new Map();
    scene = null;

    constructor(scene) {
        this.scene = scene;
        this.tilesArray = this.buildBoard();
        this.initPieces();
    }

    /**
     * Linearizes the 2D Array of meshes into a single dimension array.
     * 
     * @returns An array of THREE.Mesh objects.
     */
    getTilesArray() {
        const returnList = [];

        for (var row of this.tilesArray) {
            for (var tile of row) {
                returnList.push(tile);
            }
        }
        return returnList;
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
                
                this.worldCoordinateToArrayIndexMap.set(JSON
                    .stringify(currentPos), new Point(i, j));

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
        
        // Add the piece the board sits on, and the support for it.
        const walnutTexture = new THREE.TextureLoader()
            .load('assets/board/walnut.jpg');
        var woodGeometry = new THREE.BoxGeometry(8, .5, 8);
        var woodMaterial = new THREE.MeshPhongMaterial({
            side: THREE.DoubleSide,
            map: walnutTexture
        });
        var woodMesh = new THREE.Mesh(woodGeometry, woodMaterial);
        woodMesh.position.y = -.26;
        group.add(woodMesh);
        var cylinderGeometry = new THREE.CylinderGeometry(3.75, 3.75, .75, 128);
        var cylinderMaterial = new THREE.MeshPhongMaterial({
            side: THREE.DoubleSide,
            map: walnutTexture
        });
        var cylinderMesh = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
        cylinderMesh.position.set(0, -.75, 0);
        group.add(cylinderMesh);

        // Add a table.
        var tableGeometry = new THREE.CylinderGeometry(8, 8, .3, 128);
        var tableMaterial = new THREE.MeshPhongMaterial({
            side: THREE.DoubleSide,
            map: new THREE.TextureLoader().load('assets/board/tabletop.jpg')
        });
        var tableMesh = new THREE.Mesh(tableGeometry, tableMaterial);
        tableMesh.position.y = -1.3;
        group.add(tableMesh);

        this.scene.add(group);

        return meshesArray;
    }

    initPieces() {
        var rowCount = 0;
        // Add the black checkers.
        for (var z = -3.5; z <= -1.5; z++) {
            for (var x = -3.5; x < 3.5; x+=2) {
                var pos = new THREE.Vector3(x, 0, z);
                var arrayPoint = this.worldCoordinateToArrayIndexMap
                    .get(JSON.stringify(pos));
                
                pos.x = (rowCount == 1) ? pos.x + 1 : pos.x;

                // Need to add this to a PieceKeeper object here.
                var piece = new CheckerPiece('black', pos, this.scene);
                this.pieceKeeperArray[arrayPoint.x][arrayPoint.y] = piece;
            }  
            rowCount++;     
        }

        rowCount = 0;
        // Add the red checkers.
        for (var z = 3.5; z >= 1.5; z--) {
            for (var x = -3.5; x < 3.5; x+=2) {
                var pos = new THREE.Vector3(x, 0, z);
                var arrayPoint = this.worldCoordinateToArrayIndexMap
                    .get(JSON.stringify(pos));
                
                if (rowCount == 1) {
                    pos.x += 1;
                }

                // Need to add this to a PieceKeeper object here.
                var piece = new CheckerPiece('red', pos, this.scene);
                this.pieceKeeperArray[arrayPoint.x][arrayPoint.y] = piece;
            }  
            rowCount++;          
        }
    }

    handleClick(position) {
        var arrayPoint = this.worldCoordinateToArrayIndexMap.get(JSON
            .stringify(position));
        console.log(arrayPoint);
    }
}

class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

export { CheckerPiece, GameBoard };