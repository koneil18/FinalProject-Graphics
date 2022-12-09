import * as THREE from "three";

class Utils {

    /**
     * Calculates the midpoint between the two given points.
     *
     * @param {THREE.Vector3} firstPos The first position.
     * @param {THREE.Vector3} secondPos The second position.
     * @returns A new `THREE.Vector3` that holds the coordinates of the midpoint.
     */
    static getMidpoint(firstPos, secondPos) {
        return new THREE.Vector3(
            (firstPos.x + secondPos.x) / 2, 
            (firstPos.y + secondPos.y) / 2,
            (firstPos.z + secondPos.z) / 2
        );
    }

    /**
     * Generates a CatmullRom Curve along the given list of points.
     * 
     * @param {[THREE.Vector3, THREE.Vector3,...]} positions The array of 
     * positions to generate the curve on.
     * @param {Number} points The number of points to sample on the curve. 
     * Defaults to 50 points.
     */
    static getCatmullRomCurve(positions, points=50) {
        const curve = new THREE.CatmullRomCurve3(positions);
        return curve.getPoints(points);
    }
}

/*
*
*/
const winningPlayerLocations = {
    'red': new THREE.Vector3(5, 0, 0),
    'black': new THREE.Vector3(-5, 0, 0)
}

const worldCoordinateToPointMap = new Map();
const pointToWorldCoordinateMap = new Map();

const redTexture = new THREE.TextureLoader()
    .load('assets/pieces/red_checker_piece.png');
const blackTexture = new THREE.TextureLoader()
    .load('assets/pieces/black_checker_piece.png');
const redWinningPile = [];
const blackWinningPile = [];
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
        this.mesh.castShadow = true;
        group.add(this.mesh);
    }

    /**
     * Moves the checker piece to the specified position.
     * 
     * @param {THREE.Vector3} newPos The new position to move the piece to. 
     */
    movePosition(newPos) {
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
    allObjects = [];
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


    constructor(scene, camera, burstHandler) {
        this.scene = scene;
        this.camera = camera;
        this.burstHandler = burstHandler;

        this.tilesArray = this.buildBoard();
        this.initPieces();

        this.pieceKeeperArray[0][0].makeKing(this.boardGroup);
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

                worldCoordinateToPointMap.set(JSON
                    .stringify(currentPos), new Point(j, i));
                pointToWorldCoordinateMap.set(JSON.stringify(
                    new Point(j, i)), currentPos);

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

            this.meshGroup = group;
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
        this.allObjects.push(woodMesh);
        woodMesh.position.y = -.26;
        group.add(woodMesh);
        var cylinderGeometry = new THREE.CylinderGeometry(3.75, 3.75, .75, 128);
        var cylinderMaterial = new THREE.MeshPhongMaterial({
            side: THREE.DoubleSide,
            map: walnutTexture
        });
        var cylinderMesh = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
        this.allObjects.push(cylinderMesh);
        cylinderMesh.position.set(0, -.75, 0);
        group.add(cylinderMesh);

        // Add a table.
        var tableGeometry = new THREE.CylinderGeometry(8, 8, .3, 128);
        var tableMaterial = new THREE.MeshPhongMaterial({
            side: THREE.DoubleSide,
            map: new THREE.TextureLoader().load('assets/board/tabletop.jpg')
        });
        var tableMesh = new THREE.Mesh(tableGeometry, tableMaterial);
        this.allObjects.push(tableMesh);
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

                var arrayPoint = worldCoordinateToPointMap
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
            for (var x = -2.5; x <= 3.5; x += 2) {
                var pos = new THREE.Vector3(x, 0, z);

                if (rowCount == 1) {
                    pos.x--;
                }

                var arrayPoint = worldCoordinateToPointMap
                    .get(JSON.stringify(pos));

                var piece = new CheckerPiece('red', pos, this.boardGroup);
                var pieceKeeper = new PieceKeeper(pos, arrayPoint, piece);
                this.pieceKeeperArray[arrayPoint.x][arrayPoint.z] = pieceKeeper;
            }

            rowCount++;
        }
    }

    async handleClick(position) {
        var arrayPoint = worldCoordinateToPointMap.get(JSON
            .stringify(position));
        const selectedPiece = this.pieceKeeperArray[arrayPoint.x][arrayPoint.z];

        const clearHighlightedTileList = () => {
            this.highlightedPointList = [];
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
            if (selectedPiece != undefined) {
                if (selectedPiece.color == this.currentTurn) {

                    // Clear any tiles that may already be highlighted.
                    clearHighlightedTileList();

                    // Get the correct direction to look based on the color.
                    var zFront = startZ + ((this.currentTurn == 'red') ? -1 : 1);
                    var zJump = startZ + ((this.currentTurn == 'red') ? -2 : 2);

                    // Check for a move diagonally to the left.
                    var xLeft = startX - 1;
                    if (inBounds(xLeft, zFront)) {
                        var frontLeft = this.pieceKeeperArray[xLeft][zFront];

                        // If the piece is blank, add it to the list to 
                        // highlight. Otherwise, check for a jump.
                        if (frontLeft == undefined) {
                            posList.push(new Point(xLeft, zFront));
                        } 
                        else {
                            // If the checker on the diagonal is the opposite 
                            // team, then check 1 beyond that piece.
                            if (frontLeft.color != this.currentTurn) {
                                xLeft--;

                                // Check to see if the jump coordinate is in
                                // bounds.
                                if (inBounds(xLeft, zJump)) {
                                    var leftJumpPiece = this
                                        .pieceKeeperArray[xLeft][zJump];
                                    if (leftJumpPiece == undefined) {
                                        posList.push(new Point(xLeft, zJump));
                                    }
                                }                               
                            }
                        }
                    }   
                    
                    // Check for a move diagonally to the right.
                    var xRight = startX + 1;
                    if (inBounds(xRight, zFront)) {
                        const frontRight = this
                            .pieceKeeperArray[xRight][zFront];

                        // If the piece is blank, add it to the list to 
                        // highlight. Otherwise, check for a jump.
                        if (frontRight == undefined) {
                            posList.push(new Point(xRight, zFront));
                        } else {
                            // If the checker on the diagonal is the opposite
                            // team, then check 1 beyond that piece.
                            if (frontRight.color != this.currentTurn) {
                                xRight++;

                                // Check to see if the jump coordinate is in
                                // bounds.
                                if (inBounds(xRight, zJump)) {
                                    var rightJumpPiece = this.
                                        pieceKeeperArray[xRight][zJump];
                                    if (rightJumpPiece == undefined) {
                                        posList.push(new Point(xRight, zJump));
                                    }
                                }
                            }
                        }
                    }   
                    
                    if (selectedPiece.isKing) {
                         // Get the correct direction to look based on the color.
                        var zBehind = startZ + 
                            ((this.currentTurn == 'red') ? 1 : -1);
                        var zJump = startZ + 
                            ((this.currentTurn == 'red') ? 2 : -2);

                        // Check for a move diagonally to the left.
                        xLeft = startX - 1;
                        if (inBounds(xLeft, zBehind)) {
                            var frontLeft = this.pieceKeeperArray[xLeft][zBehind];

                            // If the piece is blank, add it to the list to 
                            // highlight. Otherwise, check for a jump.
                            if (frontLeft == undefined) {
                                posList.push(new Point(xLeft, zBehind));
                            } 
                            else {
                                // If the checker on the diagonal is the opposite 
                                // team, then check 1 beyond that piece.
                                if (frontLeft.color != this.currentTurn) {
                                    xLeft--;

                                    // Check to see if the jump coordinate is in
                                    // bounds.
                                    if (inBounds(xLeft, zJump)) {
                                        var leftJumpPiece = this
                                            .pieceKeeperArray[xLeft][zJump];
                                        if (leftJumpPiece == undefined) {
                                            posList.push(new Point(xLeft, zJump));
                                        }
                                    }                               
                                }
                            }
                        }   
                        
                        // Check for a move diagonally to the right.
                        xRight = startX + 1;
                        if (inBounds(xRight, zBehind)) {
                            const frontRight = this
                                .pieceKeeperArray[xRight][zBehind];

                            // If the piece is blank, add it to the list to 
                            // highlight. Otherwise, check for a jump.
                            if (frontRight == undefined) {
                                posList.push(new Point(xRight, zBehind));
                            } else {
                                // If the checker on the diagonal is the opposite
                                // team, then check 1 beyond that piece.
                                if (frontRight.color != this.currentTurn) {
                                    xRight++;

                                    // Check to see if the jump coordinate is in
                                    // bounds.
                                    if (inBounds(xRight, zJump)) {
                                        var rightJumpPiece = this.
                                            pieceKeeperArray[xRight][zJump];
                                        if (rightJumpPiece == undefined) {
                                            posList.push(new Point(xRight, zJump));
                                        }
                                    }
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

        const isHighlightedPointSelected = (selectedPoint) => {
            for (const point of this.highlightedPointList) {
                if (point.x == selectedPoint.x && point.z == selectedPoint.z) {
                    return true;
                }
            }

            return false;
        }

        if (this.originalPieceToMove != null && 
                isHighlightedPointSelected(arrayPoint)) {
            // Get the piece in between the point selected and the move-to pos.
            var midPointPiece = getMidPointPiece(this.originalPieceToMove
                .boardPosition.x, this.originalPieceToMove.boardPosition
                .z, arrayPoint.x, arrayPoint.z);
            
            var doJumpAnimation = (midPointPiece != null);
            const removePoint = await this.originalPieceToMove
                .movePosition(pointToWorldCoordinateMap.get(JSON
                .stringify(arrayPoint)), doJumpAnimation);
            this.pieceKeeperArray[removePoint.x][removePoint.z] = undefined;
            this.pieceKeeperArray[arrayPoint.x][arrayPoint.z] = this
                .originalPieceToMove;
            clearHighlightedTileList();
            this.originalPieceToMove = null;

            // If the piece found was not null, AKA it was a jump, move the 
            // taken piece.
            if (midPointPiece != null) {
                var removeX = midPointPiece.boardPosition.x, 
                    removeZ = midPointPiece.boardPosition.z;
                this.pieceKeeperArray[removeX][removeZ] = undefined;
                await midPointPiece.removeFromGame(this.currentTurn);
            }

            var currentPiece = this.pieceKeeperArray[arrayPoint.x][arrayPoint.z];
            // Make King by checking piece color, position, and size of winning stack
            if (this.currentTurn == 'red' && arrayPoint.z == 0){
                currentPiece.makeKing(this.meshGroup);
            } else if (this.currentTurn == 'black' && arrayPoint.z == 7){
                currentPiece.makeKing(this.meshGroup);
            }
            // Check for a winner, otherwise rotate the turn to the other player.
            if (!this.checkForWinner()) {
                await this.rotateTurn();
            }
        } else {
            highlightValidMoves();
            this.originalPieceToMove = selectedPiece;
        }
    }

    checkForWinner() {
        var winningPlayer = null;

        if (this.redWinnerCount == 12) {
            winningPlayer = 'Red';
            return true;
        }

        if (this.blackWinnerCount == 12) {
            winningPlayer = 'Black';
            return true;
        }

        return false;
    }

    rotateTurn() {
        // From https://stackoverflow.com/questions/26660395/rotation-around-an-axis-three-js
        // In order to rotate about an axis, you must construct the rotation matrix (which will rotate about the axis by default)
        // Note: You can also use Quaternions or Euler angles, which you may see if you search online
        //    That is beyond what I'd like to go over in this course, but feel free to experiment
        function rotateAboutWorldAxis(object, axis, angle) {
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
            // Gets the vector to compare to.
            let posVec = (this.currentTurn == 'red') ? new THREE
                .Vector3(0, 0, 1) : new THREE.Vector3(0, 0, -1);
            const tween = new TWEEN.Tween({angle: this.cameraAngle})
                .to({angle: 180}, 2000)
                .easing(TWEEN.Easing.Quadratic.InOut)
                .onUpdate((angle) => {
                    // Gets the normalized current position.
                    var currPos = this.camera.position.clone().setY(0)
                        .normalize();

                    // Gets the ratio of the current position to the destination.
                    var ratio = posVec.angleTo(currPos) / (Math.PI);
                    // Gets the ratio in degrees.
                    var currDeg = ratio * 180;

                    this.cameraAngle = angle.angle;

                    // Gets how far it should rotate to get the desired current 
                    // angle.
                    rotateAboutWorldAxis(this.camera, new THREE
                        .Vector3(0, 1, 0), THREE.MathUtils
                        .degToRad(angle.angle - currDeg)); 
                })
                .onComplete(() => {
                    // Flip the current turn.
                    this.currentTurn = (this.currentTurn == 'red') ? 'black' : 'red';

                    this.cameraAngle = 0;

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
        this.pieceList.push(piece);
        this.color = piece.color;
    }

    makeKing(group) {
        this.isKing = true;
        
        const newPieceColor = (this.color == 'red') ? 'black' : 'red';
        const stackTopPos = winningPlayerLocations[newPieceColor];

        if (this.color == 'red' && redWinningPile.length > 0){
            var piece = blackWinningPile.pop();
        } else if (this.color == 'black' && blackWinningPile.length > 0) {
            var piece = redWinningPile.pop();
        } else {
            var piece = new CheckerPiece(this.color, stackTopPos, group);
        }
        
        const startPos = stackTopPos;
        const endPos = this.worldPosition;
        endPos.y += .1;
        const totalAnimationTime = 1000;

        return new Promise((resolve, reject) => {
            const midPoint = Utils.getMidpoint(startPos, endPos);
            midPoint.y += 1;
            const curvePoints = Utils.getCatmullRomCurve([startPos, midPoint, 
                endPos], totalAnimationTime);

            new TWEEN.Tween({index: 0})
                .to({index: totalAnimationTime}, totalAnimationTime)
                .onUpdate((index) => {
                    const point = curvePoints[Math.floor(index.index)];
                    piece.movePosition(point);
                })
                .onComplete(() => {
                    this.pieceList.push(piece);
                    resolve();
                })
                .start();
        });
    }

    removeFromGame(winningPlayer) {
        var movePos = winningPlayerLocations[winningPlayer]
        this.pieceList.forEach(async (piece) => {
            await piece.movePosition(movePos)
            if ( winningPlayer == 'red'){
                redWinningPile.push(piece);
            }else {
                blackWinningPile.push(piece);
            }
        });
        this.worldPosition = movePos;
        this.boardPosition = null;
    }

    movePosition(position, doJumpAnimation) {
        const originalBoardPos = this.boardPosition;
        this.boardPosition = worldCoordinateToPointMap.get(JSON
            .stringify(position));
        const totalAnimationTime = 1000;
        return new Promise((resolve, reject) => {
            const startPos = {
                x: this.worldPosition.x,
                y: this.worldPosition.y,
                z: this.worldPosition.z
            };

            const endPos = {
                x: position.x,
                y: position.y,
                z: position.z
            };

            if (doJumpAnimation) {
                const midPos = {
                    x: (startPos.x + endPos.x) / 2,
                    y: 1,
                    z: (startPos.z + endPos.z) / 2
                };
                new TWEEN.Tween(startPos)
                    .to(midPos, totalAnimationTime / 2)
                    .onUpdate((currentPos) => {
                        this.pieceList.forEach((piece) => {
                            piece.movePosition(new THREE.Vector3(currentPos
                                .x, currentPos.y, currentPos.z));
                        });
                    })
                    .onComplete(() => {
                        new TWEEN.Tween(midPos)
                            .to(endPos, totalAnimationTime / 2)
                            .onUpdate((currentPos) => {
                                this.pieceList.forEach((piece) => {
                                    piece.movePosition(new THREE
                                        .Vector3(currentPos.x, currentPos
                                        .y, currentPos.z));
                                });
                            })
                            .onComplete(() => {
                                this.worldPosition = position;
                                this.boardPosition = worldCoordinateToPointMap
                                    .get(JSON.stringify(position));
                                resolve(originalBoardPos);
                            })
                            .start();
                    })
                    .start();
            } else {
                new TWEEN.Tween(startPos)
                    .to(endPos, totalAnimationTime)
                    .onUpdate((currentPos) => {
                        this.pieceList.forEach((piece) => {
                            piece.movePosition(new THREE.Vector3(currentPos
                                .x, currentPos.y, currentPos.z))
                        });
                    })
                    .onComplete(() => {
                        this.worldPosition = position;
                        this.boardPosition = worldCoordinateToPointMap.get(JSON
                            .stringify(position));
                        resolve(originalBoardPos);
                    })
                    .start();
            }
        });
        
    }
}

export { CheckerPiece, GameBoard };
