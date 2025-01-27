import { BOARDHEIGHT, OUTPUTHEIGHT } from "./constants.js"
import { Erase } from "./controlCodes.js"
import { esc_cursorTo } from "./gui.js"

export function writeToStatus(message){
    //redraw entire status line
    //alternatively, print the status left aligned to the right edge of the board, it can coexist with the spinner?
    //accepted input would have to remember to clear whole status line
    process.stdout.write(esc_cursorTo(1, BOARDHEIGHT + OUTPUTHEIGHT+4) + Erase + message) //TODO some more consts for ui locations
}