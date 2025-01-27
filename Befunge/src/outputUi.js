import { Erase } from './controlCodes.js';
import { BOARDHEIGHT, OUTPUTHEIGHT } from './constants.js';
import { esc_cursorTo } from './gui.js';

const out = process.stdout;
let output = new Array(OUTPUTHEIGHT).fill('');

export function writeToOutput(char){ //for , and .
    //If char is 10, then shift '' to output array and pop
        //redraw entire output panel
    //else append char to output[0]
        //write char to appropriate location
    //Hopefully \n == 10, else i will revisit this
    if(char == '\n'){
        output.unshift('')
        output.pop();
        redrawOutput();
    }else{
        output[0] += char;
        out.write(esc_cursorTo(output[0].length, BOARDHEIGHT + OUTPUTHEIGHT + 3) + output[0].at(-1));
    }
}

export function redrawOutput(){
    for(var i = OUTPUTHEIGHT-1; i>=0; i--){
        out.write(esc_cursorTo(1, BOARDHEIGHT + (OUTPUTHEIGHT-i) + 3) + Erase + output[i]);
    }
}