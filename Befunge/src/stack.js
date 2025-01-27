import { Erase } from "./controlCodes.js";
import { esc_cursorTo, gui_StackRow } from "./gui.js";

const out = process.stdout;
let stack = [];

export function pushInt(int){
    stack.push(int);
    redrawStack(stack);
}

export function pushChar(char){
    stack.push(char.charCodeAt());
    redrawStack(stack);
}

//"pop, pop, push" operations now redraw the stack 3 times. Instead of allowing the caller to redraw at the end, now that redrawStack is no longer called in interpreter.js
//TODO optimize
export const popStack = () => {
    let val = stack.pop() || 0;
    redrawStack();
    return val
}

function createStackString(){
    if(stack.length < 16){
        return [...stack].reverse().map(i=>i.toString().padStart(3,' ')).join('  ')
    }else{
        return `${stack.slice(-11).reverse().map(i=>i.toString().padStart(3,' ')).join('  ')}  ...  ${stack.slice(0,3).reverse().map(i=>i.toString().padStart(3,' ')).join('  ')}`
    }
}

export function redrawStack(){//for pushInt and pushChar
    out.write(esc_cursorTo(1, gui_StackRow) + Erase + 'Stack: ' + createStackString())
}