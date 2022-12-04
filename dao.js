import * as THREE from "http://cs.merrimack.edu/~stuetzlec/three.js-master/build/three.module.js";

/*
*
*/
const winningPlayerLocations = {
    'red': new THREE.Vector3(5, 0, 0),
    'black': new THREE.Vector3(-5, 0, 0)
}

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
    constructor(color, position, group) {
        this.color = color;
        this.buildPiece(group, position);
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
    buildPiece(group, position) {
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
        group.add(this.mesh);
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
    redWinnerCount = 0;
    blackWinnerCount = 0;
    currentTurn = 'red';
    validMovesVisible = false;
    highlightedPointList = [];
    currentSelectedPieceKeeper = null;
    boardGroup = null;
    cameraAngle = 0;
    originalPieceToMovePosition = null;
    highlightedTileList = [];

    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.tilesArray = this.buildBoard();
        this.initPieces();

        var blackPieceAtZero = this.pieceKeeperArray[0][0];
        this.pieceKeeperArray[1][4] = blackPieceAtZero;
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
                    .stringify(currentPos), new Point(j, i));

                const material = new THREE.MeshPhongMaterial({
                    side: THREE.DoubleSide,
                    specular: 0x050505,
                    shininess: 100,
                    map: (fillRed) ? redWoodTexture : blackWoodTexture
                });
                var currentColor = (fillRed) ? 'red' : 'black';
                fillRed = !fillRed;

                const mesh = new THREE.Mesh(geometry, material);
                mesh.tileColor = currentColor;
                meshesArray[j][i] = mesh;
                mesh.position.set(currentPos.x, currentPos.y, currentPos.z);
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
        this.scene.add(tableMesh);

        this.scene.add(group);
        this.boardGroup = group;

        return meshesArray;
    }

    initPieces() {
        var rowCount = 0;
        // Add the black checkers.
        for (var z = -3.5; z <= -1.5; z++) {
            for (var x = -3.5; x < 3.5; x += 2) {
                var pos = new THREE.Vector3(x, 0, z);

                if (rowCount == 1) {
                    pos.x++;
                }

                var arrayPoint = this.worldCoordinateToArrayIndexMap
                    .get(JSON.stringify(pos));

                var piece = new CheckerPiece('black', pos, this.boardGroup);
                var pieceKeeper = new PieceKeeper(pos, arrayPoint, piece);
                this.pieceKeeperArray[arrayPoint.x][arrayPoint.z] = pieceKeeper;
            }
            rowCount++;
        }

        rowCount = 0;
        // Add the red checkers.
        for (var z = 3.5; z >= 1.5; z--) {
            for (var x = -3.5; x < 3.5; x += 2) {
                var pos = new THREE.Vector3(x, 0, z);

                if (rowCount == 1) {
                    pos.x++;
                }

                var arrayPoint = this.worldCoordinateToArrayIndexMap
                    .get(JSON.stringify(pos));

                var piece = new CheckerPiece('red', pos, this.boardGroup);
                var pieceKeeper = new PieceKeeper(pos, arrayPoint, piece);
                this.pieceKeeperArray[arrayPoint.x][arrayPoint.z] = pieceKeeper;
            }

            rowCount++;
        }
    }

    async handleClick(position) {
        var arrayPoint = this.worldCoordinateToArrayIndexMap.get(JSON
            .stringify(position));
        const selectedPiece = this.pieceKeeperArray[arrayPoint.x][arrayPoint.z];

        const clearHighlightedTileList = () => {
            while (this.highlightedTileList.length > 0) {
                var currentTile = this.highlightedTileList.pop();
                this.scene.remove(currentTile);
            }
        };

        const highlightValidMoves = () => {

            const highlightTile = (coord) => {
                const tile = this.tilesArray[coord.x][coord.z];
                const edges = new THREE.EdgesGeometry(tile.geometry);
                const outline = new THREE.LineSegments(edges, new THREE
                    .LineBasicMaterial({ color: 'white' }));
                outline.position.set(tile.position.x, tile.position.y, tile
                    .position.z);
                this.scene.add(outline);
                this.highlightedPointList.push(coord);
                this.highlightedTileList.push(outline);
            };

            const inBounds = (x, z) => {
                if (this.pieceKeeperArray[x] == undefined) {
                    return false;
                } else {
                    if ((x >= 0 && x <= 7) && (z >= 0 && z <= 7)) {
                        return true;
                    }
                }
            }

            var startX = arrayPoint.x, startZ = arrayPoint.z;

            var posList = [];
            const selectedPiece = this.pieceKeeperArray[startX][startZ];
            if (selectedPiece != undefined) {
                if (this.tilesArray[startX][startZ].tileColor == this
                    .currentTurn && this.tilesArray[startX][startZ] !=
                        undefined) {
                    clearHighlightedTileList();

                    if (this.currentTurn == 'red') {
                        if (inBounds(startX - 1, startZ - 1)) {
                            var diagLeft = this
                            .pieceKeeperArray[startX - 1][startZ - 1];
                            if (diagLeft == undefined) {
                                posList.push(new Point(startX - 1, startZ - 1));
                            } else if (diagLeft.color != this.currentTurn) {
                                var diag2Left = this
                                    .pieceKeeperArray[startX - 2][startZ - 2];
                                if (diag2Left == undefined) {
                                    posList.push(new Point(startX - 2, startZ - 2));
                                }
                            }
                        }
                        
                        if (inBounds(startX + 1, startZ - 1)) {
                            var diagRight = this
                                .pieceKeeperArray[startX + 1][startZ - 1];
                            if (diagRight == undefined) {
                                posList.push(new Point(startX + 1, startZ - 1));
                            } else if (diagRight.color != this.currentTurn) {
                                var diag2Right = this
                                    .pieceKeeperArray[startX - 2][startZ - 2];
                                if (diag2Right == undefined) {
                                    posList.push(new Point(startX - 2, startZ - 2));
                                }
                            }
                        }

                        if (this.pieceKeeperArray[startX][startZ].isKing) {
                            if (inBounds(startX - 1, startZ + 1)) {
                                var behindLeft = this
                                    .pieceKeeperArray[startX - 1][startZ + 1];
                                if (behindLeft == undefined) {
                                    posList.push(new Point(startX - 1, startZ + 1));
                                }
                            }

                            if (inBounds(startX + 1, startZ + 1)) {
                                var behindRight = this
                                    .pieceKeeperArray[startX + 1][startZ + 1];
                                if (behindRight == undefined) {
                                    posList.push(new Point(startX + 1, startZ + 1));
                                }
                            }
                        }
                    } else {
                        if (inBounds(startX - 1, startZ + 1)) {
                            var diagLeft = this
                            .pieceKeeperArray[startX - 1][startZ + 1];
                            if (diagLeft == undefined) {
                                posList.push(new Point(startX - 1, startZ + 1));
                            } else if (diagLeft.color != this.currentTurn) {
                                var diag2Left = this
                                    .pieceKeeperArray[startX - 2][startZ + 2];
                                if (diag2Left == undefined) {
                                    posList.push(new Point(startX - 2, startZ + 2));
                                }
                            }
                        }

                        if (inBounds(startX + 1, startZ + 1)) {
                            var diagRight = this
                                .pieceKeeperArray[startX + 1][startZ + 1];
                            if (diagRight == undefined) {
                                posList.push(new Point(startX + 1, startZ + 1));
                            } else if (diagRight.color != this.currentTurn) {
                                var diag2Right = this
                                    .pieceKeeperArray[startX - 2][startZ + 2];
                                if (diag2Right == undefined) {
                                    posList.push(new Point(startX - 2, startZ + 2));
                                }
                            }
                        }

                        if (this.pieceKeeperArray[startX][startZ].isKing) {
                            if (inBounds(startX - 1, startZ - 1)) {
                                var behindLeft = this
                                    .pieceKeeperArray[startX - 1][startZ - 1];
                                if (behindLeft == undefined) {
                                    posList.push(new Point(startX - 1, startZ - 1));
                                }
                            }

                            if (inBounds(startX + 1, startZ - 1)) {
                                var behindRight = this
                                    .pieceKeeperArray[startX + 1][startZ - 1];
                                if (behindRight == undefined) {
                                    posList.push(new Point(startX + 1, startZ - 1));
                                }
                            }
                        }
                    }

                    for (var point of posList) {
                        highlightTile(point);
                    }
                }
            }
        };

        const getMidPointPiece = (x1, y1, x2, y2) => {
            var midX = (x1 + x2) / 2,
                midY = (y1 + y2) / 2;

            if (midX - Math.floor(midX) !== 0 || midY - Math
                .floor(midY) !== 0) {
                return null;
            }
            
            return this.pieceKeeperArray[midX][midY];
        }

        if (this.originalPieceToMove != null) {
            // Get the piece in between the point selected and the move-to pos.
            var midPointPiece = getMidPointPiece(this.originalPieceToMove
                .boardPosition.x, this.originalPieceToMove.boardPosition
                .z, arrayPoint.x, arrayPoint.z);
            
            // If the piece found was not null, AKA it was a jump, move the 
            // taken piece.
            if (midPointPiece != null) {
                await midPointPiece.removeFromGame(this.currentTurn);
            }

            this.originalPieceToMove = null;
            clearHighlightedTileList();
            this.rotateTurn();
        } else {
            highlightValidMoves();
            this.originalPieceToMove = selectedPiece;
        }
    }

    checkForWinner() {
        var winningPlayer = null;

        if (this.redWinnerCount == 12) {
            winningPlayer = 'Red';
        }

        if (this.blackWinnerCount == 12) {
            winningPlayer = 'Black';
        }
    }

    rotateTurn() {
        // From https://stackoverflow.com/questions/26660395/rotation-around-an-axis-three-js
        // In order to rotate about an axis, you must construct the rotation matrix (which will rotate about the axis by default)
        const rotateAboutWorldAxis = (object, axis, angle) => {
            var rotationMatrix = new THREE.Matrix4();
            rotationMatrix.makeRotationAxis(axis.normalize(), angle);
            var currentPos = new THREE.Vector4(object.position.x, object
                .position.y, object.position.z, 1);
            var newPos = currentPos.applyMatrix4(rotationMatrix);
            object.position.x = newPos.x;
            object.position.y = newPos.y;
            object.position.z = newPos.z;
            object.lookAt(0, 0, 0);
        }

        //Rotate the camera
        return new Promise((resolve, reject) => {
            const clock = new THREE.Clock();
            this.cameraAngle = 0;
            const tween = new TWEEN.Tween({angle: this.cameraAngle})
                .to({angle: this.cameraAngle + 180}, 2000)
                .onUpdate((angle) => {
                    // The angle between 0 and 180.
                    var angleToRotate = angle.angle;

                    // Rotate the camera about the Y-axis, with the small angle
                    // for this callback of the tween.
                    rotateAboutWorldAxis(this.camera, new THREE
                        .Vector3(0, 1, 0), THREE.MathUtils
                        .degToRad(angleToRotate)); 
                })
                .onComplete(() => {
                    
                    // Flip the current turn.
                    this.currentTurn = (this.currentTurn == 'red') ? 'black' : 'red';

                    if (this.cameraAngle == 360) {
                        this.cameraAngle = 0;
                    }

                    resolve();
                });
            tween.start();
        });
    }
}

class Point {
    constructor(x, z) {
        this.x = x;
        this.z = z;
    }
}

/**
 * A class for a list of pieces.
 */
class PieceKeeper {

    pieceList = [];
    isKing = false;
    worldPosition = null;
    boardPosition = null;
    color = null;

    constructor(worldPosition, boardPosition, piece) {
        this.worldPosition = worldPosition;
        this.boardPosition = boardPosition;
        this.piece = piece;
        this.color = piece.color;
    }

    isKing() {
        return this.isKing;
    }

    makeKing(piece) {
        this.isKing = true;
        this.pieceList.push(piece);

        // "Stack" the piece on top of the current piece.
        var stackPos = this.pieceList[0].worldPosition;

        var y = stackPos.y;
        this.pieceList.forEach((piece) => {
            piece.mesh.position.set(stackPos.x, y, stackPos.z);
            y += .1;
        });
    }

    removeFromGame(winningPlayer) {
        var movePos = winningPlayerLocations[winningPlayer]
        this.pieceList.forEach(async (piece) => {
            await piece.movePosition(movePos)
        });
        this.worldPosition = movePos;
        this.boardPosition = null;
    }

    movePosition(position) {
        this.pieceList.forEach((piece) => {
            piece.movePosition(position)
        });

        this.worldPosition = position;
        this.boardPosition = this.worldCoordinateToArrayIndexMap.get(
            JSON.stringify(position));
    }
}

export { CheckerPiece, GameBoard };
