import { Erase } from "./controlCodes.js";
import { esc_cursorTo } from "./gui.js";

const out = process.stdout;

function createStackString(memoryStack){
    if(memoryStack.length < 16){
        return [...memoryStack].reverse().map(i=>i.toString().padStart(3,' ')).join('  ')
    }else{
        return `${memoryStack.slice(-11).reverse().map(i=>i.toString().padStart(3,' ')).join('  ')}  ...  ${memoryStack.slice(0,3).reverse().map(i=>i.toString().padStart(3,' ')).join('  ')}`
    }
}

export function writeToStack(memoryStack){//for pushInt and pushChar
    out.write(esc_cursorTo(1, 28) + Erase + 'Stack: ' + createStackString(memoryStack))
}