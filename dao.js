/**
 * CSC3210 - Final Project
 * 
 * @author Kathryn O'Neil
 * @author Jared Rathbun
 * @author Garald Seip
 * 
 * RUBRIC FEATURES
 * 
 * 1. Ray Tracing - Used via mouse picking
 * 2. Particle Simulation - Dust that flies through the air
 * 3. Advanced Material Properties: Bump Mapping
 */

import * as THREE from "three";

/*
* A map to hold the correct winning stack location for each player.
*/
const winningPlayerLocations = {
    'red': new THREE.Vector3(-5, -1, 4.5),
    'black': new THREE.Vector3(5, -1, -4.5)
}


/**
 * A map to hold the world coordinates of the board tiles and their
 * corresponding Point objects.
 */
const worldCoordinateToPointMap = new Map();

/**
 * A map to hold the point objects of the board array and their corresponding
 * THREE.Vector3 object.
 */
const pointToWorldCoordinateMap = new Map();

// Red and Black textures for each checker piece.
const redTexture = new THREE.TextureLoader()
    .load('assets/pieces/red_checker_piece.png');
const blackTexture = new THREE.TextureLoader()
    .load('assets/pieces/black_checker_piece.png');

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

const redWinningPile = [];
const blackWinningPile = [];

/**
 * A class for a single CheckerPiece.
 */
class CheckerPiece {
    /**
     * The geometry for each piece.
     */
    geometry = new THREE.CylinderGeometry(.4, .4, .125, 32);
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
        this.buildPiece(color, group, position);
    }

    /**
     * Builds a new checker geometry and adds it to the scene, moving it to the
     * specified position.
     * 
     * @param {String} color The color of the checker piece.
     * @param {THREE.Scene} scene The scene object to add the checker piece to.
     * @param {THREE.Vector3} position The position to move the checker piece to.
     */
    buildPiece(color, group, position) {
        // Depending on the color of the checker, build the correct materials.
        this.materials = [
            // Side
            new THREE.MeshPhongMaterial({
                side: THREE.FrontSide,
                color: (this.color == 'red') ? new THREE
                    .Color('rgb(208, 12, 24)') : new THREE
                        .Color('rgb(22, 22, 22)')
            }),

            // Top
            new THREE.MeshPhongMaterial({
                side: THREE.FrontSide,
                map: (this.color == 'red') ? redTexture : blackTexture,
                bumpMap: (this.color == 'red') ? redTexture : blackTexture,
                bumpScale: .05
            }),

            // Bottom
            new THREE.MeshPhongMaterial({
                side: THREE.FrontSide,
                map: (this.color == 'red') ? redTexture : blackTexture,
                bumpMap: (this.color == 'red') ? redTexture : blackTexture,
                bumpScale: .05
            })
        ];

        this.mesh = new THREE.Mesh(this.geometry, this.materials);
        this.mesh.receiveShadow = true;
        this.mesh.position.set(position.x, position.y, position.z);

        let rotateAmount = null;
        if (color == 'red') {
            rotateAmount = Math.PI / 2;
        } else {
            rotateAmount = -Math.PI / 2
        }
        this.mesh.rotateY(rotateAmount);
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
    currentTurn = 'red';
    validMovesVisible = false;
    highlightedPointList = [];
    currentSelectedPieceKeeper = null;
    boardGroup = null;
    cameraAngle = 0;
    originalPieceToMovePosition = null;
    highlightedTileList = [];
    interactionLock = true;
    easterEgg = '';
    easterEggCode = 'wwssadadbaenter';

    /**
     * Constructs the GameBoard object and handles all logic for the game.
     * 
     * @param {THREE.Scene} scene The scene object. 
     * @param {THREE.Camera} camera The camera object.
     * @param {BurstHandler} burstHandler The burst handler object.
     */
    constructor(scene, camera, burstHandler) {
        this.scene = scene;
        this.camera = camera;
        this.burstHandler = burstHandler;

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

    /**
     * Builds the board in the scene and returns a list of the mesh objects
     * used to show the tiles of the board.
     * 
     * @returns An array of mesh objects that represents the tiles of the board.
     */
    buildBoard() {
        const meshesArray = Array.from(Array(8), () => new Array(8));
        var fillRed = false;
        const geometry = new THREE.BoxGeometry(1, .03, 1);

        const group = new THREE.Group();
        const redWoodTexture = new THREE.TextureLoader()
            .load('assets/board/red_wood.jpg'), blackWoodTexture = new THREE
                .TextureLoader().load('assets/board/black_wood.jpg');

        var x = -4.5, y = -.095, z = -3.5;
        for (var i = 0; i < 8; i++) {
            for (var j = 0; j < 8; j++) {
                x += 1;
                var currentPos = new THREE.Vector3(x, y, z);

                worldCoordinateToPointMap.set(JSON
                    .stringify(currentPos), new Point(j, i));
                pointToWorldCoordinateMap.set(JSON.stringify(
                    new Point(j, i)), new THREE.Vector3(x, 0, z));

                const material = new THREE.MeshPhongMaterial({
                    side: THREE.FrontSide,
                    specular: 0x050505,
                    shininess: 100,
                    map: (fillRed) ? redWoodTexture : blackWoodTexture
                });
                var currentColor = (fillRed) ? 'red' : 'black';
                fillRed = !fillRed;

                const mesh = new THREE.Mesh(geometry, material);
                mesh.castShadow = true;
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
            side: THREE.FrontSide,
            map: walnutTexture
        });
        var woodMesh = new THREE.Mesh(woodGeometry, woodMaterial);
        woodMesh.castShadow = true;
        woodMesh.receiveShadow = true;
        this.allObjects.push(woodMesh);
        woodMesh.position.y = -.35;
        group.add(woodMesh);
        var cylinderGeometry = new THREE.CylinderGeometry(3.75, 3.75, .75, 128);
        var cylinderMaterial = new THREE.MeshPhongMaterial({
            side: THREE.FrontSide,
            map: walnutTexture
        });
        var cylinderMesh = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
        cylinderMesh.castShadow = true;
        cylinderMesh.receiveShadow = true;
        this.allObjects.push(cylinderMesh);
        cylinderMesh.position.set(0, -.75, 0);
        group.add(cylinderMesh);

        // Add a table.
        var tableGeometry = new THREE.CylinderGeometry(8, 8, .3, 128);
        var tableMaterial = new THREE.MeshPhongMaterial({
            side: THREE.FrontSide,
            map: new THREE.TextureLoader().load('assets/board/tabletop.jpg')
        });
        var tableMesh = new THREE.Mesh(tableGeometry, tableMaterial);
        tableMesh.castShadow = true;
        tableMesh.receiveShadow = true;
        this.allObjects.push(tableMesh);
        tableMesh.position.y = -1.3;
        this.scene.add(tableMesh);

        this.scene.add(group);
        this.boardGroup = group;

        return meshesArray;
    }

    /**
     * Adds the physical checker pieces to the board.
     */
    initPieces() {
        var rowCount = 0;
        // Add the black checkers.
        for (var z = -3.5; z <= -1.5; z++) {
            for (var x = -3.5; x < 3.5; x += 2) {
                var pos = new THREE.Vector3(x, -.095, z);

                if (rowCount == 1) {
                    pos.x++;
                }

                var arrayPoint = worldCoordinateToPointMap
                    .get(JSON.stringify(pos));

                pos.y = 0;
                var piece = new CheckerPiece('black', pos, this.boardGroup);
                var pieceKeeper = new PieceKeeper(pos, arrayPoint, 
                    piece);
                this.pieceKeeperArray[arrayPoint.x][arrayPoint.z] = pieceKeeper;
            }
            rowCount++;
        }

        rowCount = 0;
        // Add the red checkers.
        for (var z = 3.5; z >= 1.5; z--) {
            for (var x = -2.5; x <= 3.5; x += 2) {
                var pos = new THREE.Vector3(x, -.095, z);

                if (rowCount == 1) {
                    pos.x--;
                }

                var arrayPoint = worldCoordinateToPointMap
                    .get(JSON.stringify(pos));

                pos.y = 0;
                var piece = new CheckerPiece('red', pos, this.boardGroup);
                var pieceKeeper = new PieceKeeper(pos, arrayPoint, piece);
                this.pieceKeeperArray[arrayPoint.x][arrayPoint.z] = pieceKeeper;
            }

            rowCount++;
        }
    }

    /**
     * Handles a click by the user. This can either show the valid moves to 
     * highlight, or move the piece to a selected position.
     * 
     * @param {THREE.Vector3} position The world coordinate the user clicked at.
     */
    async handleClick(position) {
        if(!this.interactionLock) {
            // The point object corresponding to where the user clicked.
            var arrayPoint = worldCoordinateToPointMap.get(JSON
                .stringify(position));

            // Get the piece the user selected.
            const selectedPiece = this.pieceKeeperArray[arrayPoint.x][arrayPoint.z];

            /**
             * Clears the list of highlighted tiles.
             */
            const clearHighlightedTileList = () => {
                this.highlightedPointList = [];
                while (this.highlightedTileList.length > 0) {
                    var currentTile = this.highlightedTileList.pop();
                    this.scene.remove(currentTile);
                }
            };

            /**
             * Highlights the valid moves the user can make based on the checker
             * piece they clicked on.
             */
            const highlightValidMoves = () => {

                /**
                 * Highlights the tile at the given coordinate.
                 * 
                 * @param {Point} coord The coordinate of the board to highlight.
                 */
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

                /**
                 * Returns whether or not the given coordinate is on the board or 
                 * not.
                 * 
                 * @param {Number} x The x coordinate. 
                 * @param {Number} z The z coordinate.
                 * @returns A boolean representing if the coordinate is on the board
                 * or not.
                 */
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
                        
                        // If the selected piece was a king, check for moves in the
                        // opposite direction. 
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

                        // Highlight every tile that was detected as valid.
                        for (var point of posList) {
                            highlightTile(point);
                        }
                    }
                }
            };

            /**
             * Find the piece on the board that is in the middle of the specified
             * coordinates.
             * 
             * @param {Number} x1 The first x coordinate.
             * @param {Number} z1 The first z coordinate.
             * @param {Number} x2 The second x coordinate.
             * @param {Number} z2 The second z coordinate.
             * @returns A PieceKeeper object if a jump was performed, otherwise null.
             */
            const getMidPointPiece = (x1, z1, x2, z2) => {
                var midX = (x1 + x2) / 2,
                    midZ = (z1 + z2) / 2;

                if (midX - Math.floor(midX) !== 0 || midZ - Math
                    .floor(midZ) !== 0) {
                    return null;
                }
                
                return this.pieceKeeperArray[midX][midZ];
            }

            /**
             * Returns whether or not the the point the user selected is highlighted
             * or not.
             * 
             * @param {Point} selectedPoint The point the user selected.
             * @returns A boolean representing if the point the user clicked is 
             * highlighted or not.
             */
            const isHighlightedPointSelected = (selectedPoint) => {
                for (const point of this.highlightedPointList) {
                    if (point.x == selectedPoint.x && point.z == selectedPoint.z) {
                        return true;
                    }
                }

                return false;
            }

            // If the selected point was highlighted, then a move is being made.
            if (this.originalPieceToMove != null && 
                    (this.originalPieceToMove.color == this.currentTurn || 
                        this.easterEgg == this.easterEggCode) && 
                            isHighlightedPointSelected(arrayPoint)) {
                this.interactionLock = true;

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

                    var removedColor = this.pieceKeeperArray[removeX][removeZ]
                        .color;
                    this.burstHandler.add(midPointPiece.worldPosition.clone());
                    
                    this.pieceKeeperArray[removeX][removeZ] = undefined;

                    if(removedColor == 'red')
                        await midPointPiece.removeFromGame('black');
                    else
                        await midPointPiece.removeFromGame('red');
                }

                // If a jump was made, check for a double jump.
                // if (doJumpAnimation) {
                //     this.handleClick(pointToWorldCoordinateMap.get(JSON
                //         .stringify(arrayPoint)));
                // }

                var currentPiece = this.pieceKeeperArray[arrayPoint
                    .x][arrayPoint.z];
                // Make King by checking piece color, position, and size of winning stack
                if (this.currentTurn == 'red' && arrayPoint.z == 0 && 
                    !currentPiece.isKing) {
                    await currentPiece.makeKing(this.meshGroup);
                } else if (this.currentTurn == 'black' && arrayPoint.z == 7 && 
                    !currentPiece.isKing){
                    await currentPiece.makeKing(this.meshGroup);
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
    }

    /**
     * Checks for a winner, and shows a winning message if found.
     * 
     * @returns A boolean representing if a winner was found or not.
     */
    checkForWinner(forceWinner=false, winningPlayer=null) {
        var foundWinner = false;

        var winningCounts = { red: 0, black: 0};

        this.pieceKeeperArray.forEach((row) => {
            row.forEach((pk) => {
                if (pk != undefined) {
                    winningCounts[pk.color] += pk.pieceList.length;
                }
            })
        });

        if (winningCounts['red'] === 0) {
            winningPlayer = 'black';
            foundWinner = true;
        }

        if (winningCounts['black'] === 0) {
            winningPlayer = 'red';
            foundWinner = true;
        }

        if (foundWinner || (forceWinner && winningPlayer)) {
            document.getElementById('forfeitButton').remove();
            var popUpDiv = document.createElement('div');
            popUpDiv.classList.add('fullScreenPopUp');
            popUpDiv.innerHTML = `
            <div id="preGamePopUp" class="fullScreenPopUp">
                <h5 class='winningPlayerMessage'>The ${winningPlayer} player won!</h5>
                <div class='btnsContainer'>  
                    <a href=''><button class='playAgainBtn'>Play Again</button></a>
                    <a href='https://www.youtube.com/watch?v=dQw4w9WgXcQ'><button class='playAgainBtn'>Play Super Checkers</button></a> 
                </div>
            </div>`;

            document.getElementById('body').insertBefore(popUpDiv, document.body
                .firstChild);
        }

        return foundWinner;
    }

    /**
     * Initializes the button for the current player to forfeit the game.
     */
    initForfeitButton() {
        const btn = document.createElement('button');
        btn.setAttribute("id", "forfeitButton");
        btn.classList.add('playAgainBtn');
        btn.innerText = 'Forfeit Game';
        btn.style.cssText = `
            position: absolute;
            top: 5%;
            margin-left: auto;
            margin-right: auto; 
            left: 0;
            right: 0;
            z-index: 1000000000000000000; 
            max-width: 25%;
        `;
         
        btn.onclick = () => {
            this.checkForWinner(true, 
                ((this.currentTurn == 'red') ? 'black' : 'red'));
        };

        document.getElementById('body').insertBefore(btn, document.body
            .firstChild);
    }

    /**
     * Rotates the current turn to the other user.
     * 
     * @returns A new `Promise` that will contain the position to clear on the 
     * gameboard.
     */
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
                .to({angle: 180}, 1800)
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
                    this.currentTurn = (this.currentTurn == 'red') ? 'black' 
                        : 'red';

                    this.cameraAngle = 0;

                    this.interactionLock = false;

                    resolve();
                });
            tween.start();
        });
    }    
}

/**
 * A class representing a point on the gameboard.
 */
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

    /**
     * Constructs a new `PieceKeeper` object that holds a single checker.
     * 
     * @param {THREE.Vector3} worldPosition The objects position in the scene. 
     * @param {Point} boardPosition THe objects position on the board.
     * @param {CheckerPiece} piece The piece the object holds.
     */
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
        endPos.y += .129;
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

    /**
     * Removes the `PieceKeeper` object from the gameboard and stacks it on top 
     * of one of the winning stacks.
     * 
     * @param {String} winningPlayer The player that is going to receive the 
     * checker.
     * @returns A new `Promise`.
     */
    removeFromGame(winningPlayer) {
        const startPos = this.worldPosition;
        const endPos = winningPlayerLocations[winningPlayer];
        endPos.y += (.15 * this.pieceList.length);
        const midPos = Utils.getMidpoint(startPos, endPos);
        midPos.y += 3;

        const curvePoints = Utils
            .getCatmullRomCurve([startPos, midPos, endPos], 1500);

        return new Promise((resolve, reject) => {
            return new TWEEN.Tween({index: 0})
                .to({index: 1500}, 1500)
                .onUpdate((index) => {
                    const pos = curvePoints[Math.floor(index.index)];
                    this.pieceList.forEach(async (piece) => {
                        await piece.movePosition(pos);
                    });
                })
                .onComplete(() => {
                    // Update the map for the end location.
                    winningPlayerLocations[winningPlayer] = endPos;
                    this.worldPosition = endPos;
                    this.boardPosition = null;

                    resolve();
                })
                .start();
        });    
    }

    /**
     * Moves the current PieceKeeper object to the specified point, animating a
     * "jump" if the `doJumpAnimation` flag is set to true.
     * 
     * @param {THREE.Vector3} position The position to move the PieceKeeper to.
     * @param {Boolean} doJumpAnimation Whether or not to perform a jump 
     * animation.
     * @returns A Promise that will resolve the original position of the piece.
     */
    movePosition(position, doJumpAnimation) {
        const originalBoardPos = this.boardPosition;
        this.boardPosition = worldCoordinateToPointMap.get(JSON
            .stringify(new THREE.Vector3(position.x, -.095, position.z)));
        const totalAnimationTime = 1000;

        return new Promise((resolve, reject) => {
            // Check for a jump, using a curve to move the pieces along. 
            // Otherwise, slide the piece on the board.
            if (doJumpAnimation) {
                // Get the start and end positions, along with an endpoint.
                const startPos = this.worldPosition;
                const endPos = position;
                const midPos = Utils.getMidpoint(startPos, endPos);

                // Elevate the endpoint by .75.
                midPos.y += .75;

                // Generate the curve.
                const curvePoints = Utils.getCatmullRomCurve([startPos, midPos, 
                    endPos], totalAnimationTime);
                new TWEEN.Tween({index: 0})
                    .to({index: totalAnimationTime})
                    .onUpdate((index) => {
                        // Get the point in the list to move to, then move each
                        // CheckerPiece in the list.
                        const currentPos = curvePoints[Math.floor(index.index)];

                        this.pieceList[0].movePosition(currentPos);

                        if (this.pieceList.length > 1) {
                            currentPos.y += .15;
                            this.pieceList[1].movePosition(currentPos);
                        }
                    })
                    .onComplete(() => {
                        this.worldPosition = position;
                        this.boardPosition = worldCoordinateToPointMap
                            .get(JSON.stringify(new THREE.Vector3(position.x, 
                            -.095, position.z)));
                        resolve(originalBoardPos);   
                    })
                    .start();
            } else { 
                const startPos = {
                    x: this.worldPosition.x,
                    y: this.worldPosition.y,
                    z: this.worldPosition.z
                };
                const endPos = {
                    x: position.x,
                    y: position.y,
                    z: position.z
                }

                new TWEEN.Tween(startPos)
                    .to(endPos, totalAnimationTime)
                    .onUpdate((currentPos) => {
                        const currentVec = new THREE.Vector3(currentPos.x, 
                            currentPos.y, currentPos.z);
                        this.pieceList[0].movePosition(currentVec);

                        if (this.pieceList.length > 1) {
                            currentVec.y += .15;
                            this.pieceList[1].movePosition(currentVec);
                        }
                    })
                    .onComplete(() => {
                        this.worldPosition = position;
                        this.boardPosition = worldCoordinateToPointMap.get(JSON
                            .stringify(new THREE.Vector3(position.x, -.095, 
                                position.z)));
                        resolve(originalBoardPos);
                    })
                    .start();
            }
        });
        
    }
}

export { CheckerPiece, GameBoard };
