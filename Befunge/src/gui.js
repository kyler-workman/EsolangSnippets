import { Clear, Reset } from './controlCodes.js';
import { BOARDHEIGHT, BOARDWIDTH, OUTPUTHEIGHT, POINTERBG, POINTERCOLOR } from './constants.js';
import { gui_SpinnerWidth, redrawSpinner } from './spinner.js';
import { redrawStack } from './stack.js';
import { redrawOutput } from './outputUi.js';

export const BorderSize = 1; //Does not currently support any value other than 1
const SideGapSize = 1;
export const gui_StackRow = (BorderSize * 2) + BOARDHEIGHT + 1;
export const gui_StatusRow = gui_StackRow + OUTPUTHEIGHT + 1;

const cursorStorage = [gui_SpinnerWidth + 1, gui_StatusRow];
export const esc_cursorToStorage = () => esc_cursorTo(...cursorStorage);

const out = process.stdout;

// Move the cursor up N lines: \033[<N>A
// Move the cursor down N lines: \033[<N>B
// Move the cursor forward N columns: \033[<N>C
// Move the cursor backward N columns: \033[<N>D
export const esc_cursorTo = (r,d) => `\x1b[${d};${r}H`
export const esc_cursorUp = (c) => `\x1b[${c}A`
export const esc_cursorDown = (c) => `\x1b[${c}B`
export const esc_cursorRight = (c) => `\x1b[${c}C`
export const esc_cursorLeft = (c) => `\x1b[${c}D`

export function redrawDisplay(board){
    let rightmax = BOARDWIDTH + (BorderSize * 2) + (SideGapSize * 2);
    let bottommax = BOARDHEIGHT + (BorderSize * 2);
    out.write(Clear + esc_cursorTo(1, 1) + '\u2554'); //top left
    out.write(esc_cursorTo(rightmax, 1) + '\u2557'); //top right
    out.write(esc_cursorTo(1, bottommax) + '\u255A'); //bottom left
    out.write(esc_cursorTo(rightmax, bottommax) + '\u255D'); //bottom right

    out.write(esc_cursorTo(BorderSize + 1, 1) + '\u2550'.repeat(rightmax - (BorderSize * 2))); //top row
    out.write(esc_cursorTo(BorderSize + 1, bottommax) + '\u2550'.repeat(rightmax - (BorderSize * 2))); //bottom row

    for(let i = 0; i < BOARDHEIGHT; i++){
        out.write(esc_cursorTo(1, i + BorderSize + 1) + `\u2551${' '.repeat(SideGapSize)}`); //left border
        out.write(board[i].join('')); //content //TODO find a way to render unprintable/control characters (see samples\dna)
        out.write(`${' '.repeat(SideGapSize)}\u2551`); //right border
    }

    redrawStack();
    redrawOutput();
    redrawSpinner();
}
export function unhighlightCurrentCell(board, x, y){ //and unhighlight the previous
    out.write(esc_cursorTo(x + BorderSize + SideGapSize + 1, y + BorderSize + SideGapSize) + Reset + board[y][x])
}
export function highlightNextCell(board, x, y){
    out.write(esc_cursorTo(x + BorderSize + SideGapSize + 1, y + BorderSize + SideGapSize) + POINTERBG + POINTERCOLOR + board[y][x] + Reset + esc_cursorToStorage());
}