import { esc_cursorToStorage } from './gui.js';
import { writeToStatus } from './status.js';

const spinner = ['>    ','=>   ','==>  ','===> ','====>',' ===>','  ==>','   =>','    >','    -',
    '    <','   <=','  <==',' <===','<====','<=== ','<==  ','<=   ','<    ','-    ']
let spinnerState = 0;

export function tickSpinner(){ //uses the status row for a spinner, just for fun (-\|/)
    //redraw entire status line
    spinnerState = (spinnerState + 1) % spinner.length;
    redrawSpinner();
}

export function redrawSpinner(){
    writeToStatus(spinner[spinnerState]);
    //TODO find a good place to store the cursor, or a way to hide it. 'Hidden does nothing'
    process.stdout.write(esc_cursorToStorage())
}