/* ######################## */
/* ### Global variables ### */
/* ######################## */

const CELL_SIZE = 25;
const UNIVERSE_LIFE_PROBABILITY = 0.3;

let universe;
let universeWidth, universeHeight;

let isRunning = false;
let isColored = false;
let frameSpeed = 8;

const COLOR_SCALE = chroma.scale(['00f2f2', '0075f2']);
const COLOR_LIGHTNESS_THRESHOLD = 0.1;
const COLOR_FADE = 0.15;

/* ###################### */
/* ### User Interface ### */
/* ###################### */

const NAV_HEIGHT = 40;

/* ####################### */
/* ### P5 js functions ### */
/* ####################### */

function setup() {
    const life = createCanvas(windowWidth, windowHeight - NAV_HEIGHT)
    life.parent('universe-grid');
    cursor(HAND);

    background(0);
    noStroke();
    frameRate(frameSpeed);

    // Create universe
    universeWidth = Math.floor(width / CELL_SIZE);
    universeHeight = Math.floor(height / CELL_SIZE);
    universe = new Universe(universeWidth, universeHeight);
}

function draw() {
    if (isRunning) universe.nextGeneration();
    universe.show(isColored);
}

/* ################ */
/* ### Controls ### */
/* ################ */

function mousePressed() {
    if (mouseButton == LEFT) {
        // Grid dimensions
        const GRID_LINE_DIM = width / universeWidth;
        const GRID_COLUMN_DIM = height / universeHeight;

        // Check if mouse is over a cell
        for (let y = 0; y < universeWidth; y++) {
            for (let x = 0; x < universeHeight; x++) {
                if (
                    mouseY > y * GRID_LINE_DIM &&
                    mouseY < y * GRID_LINE_DIM + GRID_LINE_DIM &&
                    mouseX > x * GRID_COLUMN_DIM &&
                    mouseX < x * GRID_COLUMN_DIM + GRID_COLUMN_DIM
                ) {
                    // Update cell state
                    const cell = universe.getCell(x, y);
                    cell.isAlive ^= true;

                    // Update color
                    if (cell.isAlive) {
                        // Assign a random color within the scale
                        cell.color = COLOR_SCALE(Math.random()).hex();
                    } else {
                        // Delete into black
                        cell.color = chroma('black').hex();
                    }

                    universe.show();
                }
            }
        }
    }
}

function keyPressed() {
    if (key == 'p') {
        isRunning ^= true;
    } else if (key == 's' && !isRunning) {
        saveCanvas(universe.getStateTitle());
    } else if (key == '+') {
        if (frameSpeed < 60) frameRate(++frameSpeed);
    } else if (key == '-') {
        if (frameSpeed > 1) frameRate(--frameSpeed);
    } else if (key == 'c') {
        isColored ^= true;
    } else if (key == 'd') {
        universe.clear();
    } else if (key == 'r') {
        universe.random(UNIVERSE_LIFE_PROBABILITY);
    }
}

/* ################ */
/* ### Universe ### */
/* ################ */

class Universe {
    constructor(dimX, dimY) {
        this.dimX = dimX;
        this.dimY = dimY;
        this.generation = 0;

        // Create cells
        this.random(UNIVERSE_LIFE_PROBABILITY);

    }

    getCell(x, y) {
        return this.cells[y * this.dimX + x];
    }


    show(colorize = false) {
        for (let y = 0; y < this.dimY; y++) {
            for (let x = 0; x < this.dimX; x++) {
                // Current cell
                const cell = this.getCell(x, y);
                const cellColor = cell.color;

                // Color
                if (colorize) {
                    fill(cellColor);
                } else {
                    fill(cell.isAlive ? 'white' : 'black');
                }

                rect(
                    x * (width / this.dimX),
                    y * (height / this.dimY),
                    width / this.dimX,
                    height / this.dimY
                );
            }
        }
    }

    nextGeneration() {
        const nextGen = [];

        // Apply game of life rules
        // https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life#Rules
        this.cells.forEach(cell => {
            // Current cell specs
            const x = cell.x;
            const y = cell.y;
            const alive = this.getCell(x, y).isAlive;
            const aliveNeighbours = this.getCell(x, y).getLiveNeighboursCount(this);
            const color = cell.color;
            const aliveNeighboursColors = cell.getLiveNeighboursColors();

            // Next cell state
            let nextState;
            if (alive) {
                // Any live cell with two or three live neighbours survives
                nextState = (aliveNeighbours == 2 || aliveNeighbours == 3);
            } else {
                // Any dead cell with three live neighbours becomes a live cell
                nextState = (aliveNeighbours == 3)
            }

            // Next cell color
            let nextColor;
            if (alive && nextState) {
                // A cell who is alive average its color with the ones of its live neighbours
                nextColor = chroma.average(aliveNeighboursColors).hex();
            } else if (!alive && nextState) {
                // A cell who is born get assign a random color within the scale
                nextColor = COLOR_SCALE(Math.random()).hex();
            } else {
                // The color of a dead cell will fade away until a reach a threshold
                nextColor = chroma(color).darken(COLOR_FADE).hex();

                if (chroma(color).hsl()[2] < COLOR_LIGHTNESS_THRESHOLD) {
                    nextColor = color;
                }
            }

            // Create next generation cell
            nextGen.push(new Cell(this, x, y, nextState, nextColor))
        });

        // Save next generation
        this.cells = nextGen;
        this.generation++;
    }

    clear() {
        this.random(0);
        isRunning = false;
    }

    random(lifeProbability) {
        // Clear cells
        this.cells = [];

        for (let y = 0; y < this.dimY; y++) {
            for (let x = 0; x < this.dimX; x++) {
                const isAlive = Math.random() < lifeProbability;
                this.cells.push(
                    new Cell(
                        this, x, y, isAlive,
                        isAlive ? COLOR_SCALE(Math.random()).hex() : chroma('black').hex()
                    )
                );
            }
        }

        this.generation = 0;
        this.generateHashId();
    }

    generateHashId() {
        this.id = '';

        // Retrieved cells state
        this.cells.forEach(cell => {
            this.id += cell.isAlive ? '1' : '0';
        });

        // Hash
        // https://blog.trannhat.xyz/generate-a-hash-from-string-in-javascript/
        const hashCode = s => s.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);

        this.id = hashCode(this.id);
    }

    // Does not take into accoutn modification due to mouse presses
    getStateTitle() {
        return 'S' + this.id + 'G' + this.generation + 'C' + (isColored ? '1' : '0');
    }
}

/* ############ */
/* ### Cell ### */
/* ############ */

class Cell {
    constructor(universe, x, y, isAlive, color) {
        this.universe = universe;
        this.x = x;
        this.y = y;
        this.isAlive = isAlive;
        this.color = color;

        // Assign neighbours indices
        const leftX = (this.x - 1 + this.universe.dimX) % this.universe.dimX;
        const rightX = (this.x + 1) % this.universe.dimX;
        const aboveY = (this.y - 1 + this.universe.dimY) % this.universe.dimY;
        const belowY = (this.y + 1) % this.universe.dimY;

        this.IndexUp = [this.x, aboveY];
        this.IndexUpRight = [rightX, aboveY];
        this.IndexRight = [rightX, this.y];
        this.IndexDownRight = [rightX, belowY];
        this.IndexDown = [this.x, belowY];
        this.IndexDownLeft = [leftX, belowY];
        this.IndexLeft = [leftX, this.y];
        this.IndexUpLeft = [leftX, aboveY];
    }

    getNeighbours() {
        return [
            this.universe.getCell(this.IndexUp[0], this.IndexUp[1]),
            this.universe.getCell(this.IndexUpRight[0], this.IndexUpRight[1]),
            this.universe.getCell(this.IndexRight[0], this.IndexRight[1]),
            this.universe.getCell(this.IndexDownRight[0], this.IndexDownRight[1]),
            this.universe.getCell(this.IndexDown[0], this.IndexDown[1]),
            this.universe.getCell(this.IndexDownLeft[0], this.IndexDownLeft[1]),
            this.universe.getCell(this.IndexLeft[0], this.IndexLeft[1]),
            this.universe.getCell(this.IndexUpLeft[0], this.IndexUpLeft[1])
        ];
    }

    getNeighboursState() {
        const states = [];
        this.getNeighbours().forEach(cell => {
            states.push(cell.isAlive);
        });

        return states;
    }

    getLiveNeighboursColors() {
        const colors = [];
        this.getNeighbours().forEach(cell => {
            if (cell.isAlive) {
                colors.push(cell.color);
            }
        });

        return colors;
    }

    die() {
        this.isAlive = false;
    }

    getLiveNeighboursCount() {
        return this.getNeighboursState().filter(Boolean).length;
    }
}