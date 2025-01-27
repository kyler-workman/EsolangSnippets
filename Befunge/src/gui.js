import { Clear, Reset } from './controlCodes.js';
import { BOARDHEIGHT, POINTERBG, POINTERCOLOR } from './constants.js';
import { redrawSpinner } from './spinner.js';
import { redrawStack } from './stack.js';
import { redrawOutput } from './outputUi.js';

const out = process.stdout;
const cursorStorage = [6, 34]; //(1, 34) ?? //Also based on spinner length //TODO remove magic numbers

export const esc_cursorToStorage = () => esc_cursorTo(...cursorStorage);

const stackRow = 1;

const BorderMarginSize = 2;
export const gui_StackRow = BorderMarginSize + BOARDHEIGHT + stackRow;

// Move the cursor up N lines: \033[<N>A
// Move the cursor down N lines: \033[<N>B
// Move the cursor forward N columns: \033[<N>C
// Move the cursor backward N columns: \033[<N>D
//#region GUI methods
export const esc_cursorTo = (r,d) => `\x1b[${d};${r}H`
export const esc_cursorUp = (c) => `\x1b[${c}A`
export const esc_cursorDown = (c) => `\x1b[${c}B`
export const esc_cursorRight = (c) => `\x1b[${c}C`
export const esc_cursorLeft = (c) => `\x1b[${c}D`
export function redrawDisplay(board){
    out.write(Clear + esc_cursorTo(1,1) + '\u2554' + esc_cursorTo(84,1) + '\u2557' + esc_cursorTo(1,27) + '\u255A' + esc_cursorTo(84,27) + '\u255D'); //TODO remove magic numbers
    //        top left                   top right                   bottom left                 bottom right
    out.write(esc_cursorTo(2,1) + '\u2550'.repeat(82) + esc_cursorTo(2,27) + '\u2550'.repeat(82)); //top and bottom
    // for(var i = 2; i < 27; i++) out.write(cursorTo(1,i) + '\u2016' + cursorTo(84,i) + '\u2016'); //sides
    for(let i=0; i<25; i++){ //board content and sides
        out.write(esc_cursorTo(1,i+2) + `\u2551 ${board[i].join('')} \u2551`);
    }
    // out.write(cursorTo(3,2) + POINTERBG + POINTERCOLOR + board[0][0] + Reset); //highlight initial pointer cell
    redrawStack();
    redrawOutput();
    redrawSpinner();
}
export function unhighlightCurrentCell(board, x, y){ //and unhighlight the previous
    out.write(esc_cursorTo(x + 3,y + 2) + Reset + board[y][x])
}
export function highlightNextCell(board, x, y){
    out.write(esc_cursorTo(x + 3,y + 2) + POINTERBG + POINTERCOLOR + board[y][x] + Reset + esc_cursorToStorage());
}