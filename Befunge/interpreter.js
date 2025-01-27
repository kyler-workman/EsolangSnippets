import { BOARDHEIGHT, BOARDWIDTH, STEPDELAYMS } from './src/constants.js';
import { highlightNextCell, redrawDisplay, unhighlightCurrentCell } from './src/gui.js';
import { writeToOutput } from './src/outputUi.js';
import { tickSpinner } from './src/spinner.js';
import { popStack, pushChar, pushInt } from './src/stack.js';
import { writeToStatus } from './src/status.js';
import * as fs from 'fs';

//TODO change how filename is detected, might not be 2?

//#region interpreter init
var x = 0,
y = 0;
var direction = 'r';
var stringMode = false;
var board = process.argv[2]
? loadBoardFromFile(process.argv[2])
: new Array(25).fill(new Array(80).fill(' '));

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
function up(){ direction = 'u' }
function down(){ direction = 'd' }
function left(){ direction = 'l' }
function right(){ direction = 'r' }
function goRandom(){
    var r = Math.random();
    if      (r < .25) up();
    else if (r < .5) down();
    else if (r < .75) left();
    else right();
}
function horizontalIf(){
    var e = popStack();
    if(e==0)right();
    else left();
}
function verticalIf(){
    var e = popStack();
    if(e==0) down();
    else up();
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
    switch(direction){
        case 'u':
            y = (y + (BOARDHEIGHT - 1)) % BOARDHEIGHT;
            break;
        case 'd':
            y = (y + 1) % BOARDHEIGHT
            break;
        case 'l':
            x = (x + (BOARDWIDTH - 1)) % BOARDWIDTH
            break;
        case 'r':
            x = (x + 1) % BOARDWIDTH
            break;
    }
    highlightNextCell(board, x, y);
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
    redrawDisplay(board); //TODO instead of redrawing the whole board, just write the char that was "put"
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
    if(lines.length>25)
        throw new Error(`Input too tall, max Befunge-93 line height:25. Lines:${lines.length}`);
    var board = lines.map((l,i)=>{
        if(l.length>80)
            throw new Error(`Input line too long, max Befunge-93 line length:80. Line ${i+1}: ${l}`);
        var l2 = l.padEnd(80,' ');
        return [...l2];
    });
    while(board.length<25)
        board.push(new Array(80).fill(' '));
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
                right();
                break;
            case '<':
                left();
                break;
            case '^':
                up();
                break;
            case 'v':
                down();
                break;
            case '?':
                goRandom();
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
                direction = 'x'
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

    if(direction == 'x'){
        writeToStatus('done');
        process.exit(); //Could disable interpreter interval as well if we want to do cleanup.
    }
    else{
        move();
    }
}

//#endregion processing functions

//PROGRAM START
redrawDisplay(board);
highlightNextCell(board, x, y);
setInterval(step, STEPDELAYMS);