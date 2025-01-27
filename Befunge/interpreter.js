import { BOARDHEIGHT, BOARDWIDTH, STEPDELAYMS } from './src/constants.js';
import { drawBoardChar, highlightCurrentCell, redrawDisplay, unhighlightCurrentCell } from './src/gui.js';
import { writeToOutput } from './src/outputUi.js';
import { tickSpinner } from './src/spinner.js';
import { popStack, pushChar, pushInt } from './src/stack.js';
import { writeToStatus } from './src/status.js';
import { Direction } from './src/enums.js';
import * as fs from 'fs';

//TODO change how filename is detected, might not be 2?

//#region interpreter init
var x = 0,
    y = 0;
var instructionPointerDirection = Direction.Right;
let terminateInterpreter = false;
var stringMode = false;
var board = process.argv[2]
    ? loadBoardFromFile(process.argv[2])
    : new Array(BOARDHEIGHT).fill(new Array(BOARDWIDTH).fill(' '));

let usr = process.stdin;
//get stream always, without needing enter
usr.setRawMode(true);
//make node never quit, unless process.exit or an error happens
usr.resume();
//real stuff
usr.setEncoding('utf8')

usr.on('data', k =>{
    if(k == '\u0003') //ctrl-c
        process.exit();
    //TODO check for if interpreter is waiting for user input, if it is then send the key to the waiter if it is not a control character
    // out.write(k);
    // console.log(k.toString('utf8').charCodeAt());
    // out.write(Buffer.from(k.toString('utf8').charCodeAt().toString()));
});
//#endregion interpreter init

//#region language functions
function add(){
    var a = popStack(), b = popStack();
    pushInt(a + b);
}
function subtract(){
    var a = popStack(), b = popStack();
    pushInt(b - a);
}
function multiply(){
    var a = popStack(), b = popStack();
    pushInt(a * b);
}
function divide(){
    var a = popStack(), b = popStack();
    let result = a === 0
        ? promptForInt(`Attempted to divide ${b} by 0, enter desired quotient`)
        : Math.floor(b / a);

    pushInt(result);
}
function mod(){
    var a = popStack(), b = popStack();
    pushInt(b % a)
}
function not(){
    var e = popStack()
    pushInt(e ? 0 : 1);
}
function greaterThan(){
    var a = popStack(), b = popStack();
    pushInt(b > a ? 1 : 0);
}

const changeDirection = (d) => instructionPointerDirection = d;

const changeDirectionRandom = () => instructionPointerDirection = [Direction.Up, Direction.Down, Direction.Left, Direction.Right][Math.floor(Math.random() * 4)];

function horizontalIf(){
    var e = popStack();
    if(e==0) changeDirection(Direction.Right);
    else changeDirection(Direction.Left);
}
function verticalIf(){
    var e = popStack();
    if(e==0) changeDirection(Direction.Down);
    else changeDirection(Direction.Up);
}
function toggleStringmode(){ stringMode =! stringMode }
function duplicate(){
    var e = popStack();
    pushInt(e);
    pushInt(e);
}
function swap(){
    var a = popStack(), b = popStack();
    pushInt(a);
    pushInt(b);
}
function discard(){
    popStack();
}
function writeInt(){
    var e = popStack()
    var int = e.toString();
    for(var c of int) writeToOutput(c);
}
function writeChar(){
    var e = popStack();
    writeToOutput(String.fromCharCode(e));
}
function move(){ //bridge calls this
    unhighlightCurrentCell(board, x, y);
    switch(instructionPointerDirection){
        case Direction.Up:
            y = (y + (BOARDHEIGHT - 1)) % BOARDHEIGHT;
            break;
        case Direction.Down:
            y = (y + 1) % BOARDHEIGHT
            break;
        case Direction.Left:
            x = (x + (BOARDWIDTH - 1)) % BOARDWIDTH
            break;
        case Direction.Right:
            x = (x + 1) % BOARDWIDTH
            break;
    }
    highlightCurrentCell(board, x, y);
}
function get(){
    var y = popStack(),
        x = popStack();
    var e = board[y][x]
    pushInt(e.charCodeAt());
}
function put(){
    var y = popStack(),
        x = popStack(),
        e = popStack();
        //TODO throw if OOB
    board[y][x] = String.fromCharCode(e);

    //This method does not need to redraw the entire board,
    //but I'm sure it breaks some kind of rule by exposing a way to circumvent normal redrawing via the gui module.
    //I dont like the UI flashing though, so it's staying like this.
    drawBoardChar(x, y, board[y][x]);
    //redrawDisplay(board);
}
function promptForInt(prompt){
    let fullPrompt = prompt || "Input Integer";

    //https://github.com/nodejs/node/issues/28243#issuecomment-502402453
    let s = '', buf = Buffer.alloc(1);
    while(buf[0] - 10 && buf[0] - 13){ //10 is LF, 13 is CR
        writeToStatus(`${fullPrompt}: ${s}`);
        fs.readSync(0, buf, 0, 1, 0);

        if(buf[0] >= 48 && buf[0] <= 57) //Digits
            s += buf;
        else if(buf[0] == 8 || buf[0] == 127) //Backspace
            s = s.slice(0, -1);
        else if(buf[0] == 3) //Manually handle Ctrl-C
            process.exit();
    }
    return parseInt(s);
}

/**
 * Reads a printable character and pushes its ASCII value to the stack,
 * CR/LF/RETURN are a separate case and will push 0.
 */
function userChar(){
    let prompt = "Input Character: ";
    writeToStatus(prompt);

    let buf = Buffer.alloc(1);
    while(!(buf[0] >= 32 && buf[0] <= 126) && buf[0] - 10 && buf[0] - 13){ //Printable ASCII
        fs.readSync(0, buf, 0, 1, 0);
        if(buf[0] == 3) //Manually handle Ctrl-C
            process.exit();
    }

    if(buf[0] == 10 || buf[0] == 13) //LF/CR
        buf[0] = 0;

    pushInt(buf[0]);
}
//#endregion language functions

//#region processing functions

//TODO test lines too long
//TODO test too many lines
function loadBoardFromFile(fileName){
    //TODO convert tabs to spaces when parsing tab == 4 spaces
    var f = fs.readFileSync(fileName, "utf8");
    var lines = f.split(/\r?\n/);
    if(lines.length > BOARDHEIGHT)
        throw new Error(`Input too tall, max line height:${BOARDHEIGHT}. Lines:${lines.length}`);
    var board = lines.map((l, i)=>{
        if(l.length > BOARDWIDTH)
            throw new Error(`Input line too long, max line length:${BOARDWIDTH}. Line ${i+1}: ${l}`);
        var l2 = l.padEnd(BOARDWIDTH, ' ');
        return [...l2];
    });
    while(board.length<BOARDHEIGHT)
        board.push(new Array(BOARDWIDTH).fill(' '));
    return board;
}

function step(){
    tickSpinner();
    var instruction = board[y][x];

    if(stringMode){
        if(instruction == '"')
            toggleStringmode();
        else
            pushChar(instruction);
    }else{
        switch(instruction){
            case ' ': //NOOP
                break;
            case '+':
                add();
                break;
            case '-':
                subtract();
                break;
            case '*':
                multiply();
                break;
            case '/':
                divide();
                break;
            case '%':
                mod();
                break;
            case '!':
                not();
                break;
            case '`':
                greaterThan();
                break;
            case '>':
                changeDirection(Direction.Right);
                break;
            case '<':
                changeDirection(Direction.Left);
                break;
            case '^':
                changeDirection(Direction.Up);
                break;
            case 'v':
                changeDirection(Direction.Down);
                break;
            case '?':
                changeDirectionRandom();
                break;
            case '_':
                horizontalIf();
                break;
            case '|':
                verticalIf();
                break;
            case '"':
                toggleStringmode();
                break;
            case ':':
                duplicate();
                break;
            case '\\':
                swap();
                break;
            case '$':
                discard();
                break;
            case '.':
                writeInt();
                break;
            case ',':
                writeChar();
                break;
            case '#':
                move();
                break;
            case 'g':
                get();
                break;
            case 'p':
                put();
                break;
            case '&':
                let int = promptForInt();
                pushInt(int);
                break;
            case '~':
                userChar();
                break;
            case '@':
                terminateInterpreter = true;
                break;
            case '0':
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
            case '9':
                pushInt(parseInt(instruction));
                break;
            default:
                throw new Error(`Unexpected instruction found at (${x},${y}): ${instruction}`);
        }
    }

    if(terminateInterpreter){
        writeToStatus('done'); //TODO not working anymore for some reason
        process.exit(); //Could disable interpreter interval as well if we want to do cleanup.
    }
    else{
        move();
    }
}

//#endregion processing functions

//PROGRAM START
redrawDisplay(board);
highlightCurrentCell(board, x, y);
setInterval(step, STEPDELAYMS);