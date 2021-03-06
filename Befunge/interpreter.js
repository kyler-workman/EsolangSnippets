
var fs = require('fs')

Reset = "\x1b[0m"
Bright = "\x1b[1m"
Dim = "\x1b[2m"
Underscore = "\x1b[4m"
Blink = "\x1b[5m"
Reverse = "\x1b[7m"
Hidden = "\x1b[8m"

FgBlack = "\x1b[30m"
FgRed = "\x1b[31m"
FgGreen = "\x1b[32m"
FgYellow = "\x1b[33m"
FgBlue = "\x1b[34m"
FgMagenta = "\x1b[35m"
FgCyan = "\x1b[36m"
FgWhite = "\x1b[37m"

BgBlack = "\x1b[40m"
BgRed = "\x1b[41m"
BgGreen = "\x1b[42m"
BgYellow = "\x1b[43m"
BgBlue = "\x1b[44m"
BgMagenta = "\x1b[45m"
BgCyan = "\x1b[46m"
BgWhite = "\x1b[47m"

Erase = '\x1b[K'
Clear = '\x1b[2J'
Hidecursor = '\x1b[?25l'
Showcursor = '\x1b[?25h'

// Position the Cursor: \033[<L>;<C>H or \033[<L>;<C>f (puts the cursor at line L and column C)
// Move the cursor up N lines: \033[<N>A
// Move the cursor down N lines: \033[<N>B
// Move the cursor forward N columns: \033[<N>C
// Move the cursor backward N columns: \033[<N>D
// Clear the screen, move to (0,0): \033[2J
// Erase to end of line: \033[K
// Save cursor position: \033[s
// Restore cursor position: \033[u

//TODO change how filename is detected, might not be last?

//#region constansts
var BOARDHEIGHT = 25;
var BOARDWIDTH  = 80;
var OUTPUTHEIGHT = 5;
var INSTANT = false; //TODO turn this into a flag arg for instant or debug speeds with visual board
var POINTERCOLOR = FgBlack;
var POINTERBG = BgYellow;
var usr = process.stdin;
var out = process.stdout;
// var spinner = '-\\|/';
var spinner = ['>    ','=>   ','==>  ','===> ','====>',' ===>','  ==>','   =>','    >','    -',
               '    <','   <=','  <==',' <===','<====','<=== ','<==  ','<=   ','<    ','-    ']

var iFiguredOutHowToRemoveTheCursor = false;
var useColorHighlightingAnyways = true;
var useCursorPointer = !iFiguredOutHowToRemoveTheCursor && !useColorHighlightingAnyways;

var cursorStorage = [6,34]; //(1,34) ?? //Also based on spinner length //TODO remove magic numbers
//#endregion constants

//#region interpreter init
var divideByZeroThrows = true; //TODO flag to change the behavior of /0 based on spec.
var x = 0,
    y = 0;
var direction = 'r';
var stack = [];
var stringMode = false;
var board = process.argv[2]
? loadBoardFromFile(process.argv[2])
: new Array(25).fill(new Array(80).fill(' '));
var spinnerState = -1;
var output = new Array(OUTPUTHEIGHT).fill('');

//get stream always, withut needing enter
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
var popStack = () => stack.pop() || 0;
function pushInt(int){
    stack.push(int);
    writeToStack();
}
function pushChar(char){
    stack.push(char.charCodeAt());
    writeToStack();
}
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
    if(a == 0 && (divideByZeroThrows || false)) //TODO implement
        throw new Error(`Divide by zero attempt at (${x},${y}) 0/${b}`);
    pushInt(Math.floor(a / b));
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
    writeToStack();
}
function verticalIf(){
    var e = popStack();
    if(e==0) down();
    else up();
    writeToStack();
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
    writeToStack();
}
function writeInt(){
    var e = popStack()
    var int = e.toString();
    for(var c of int) writeToOutput(c);
    writeToStack();
}
function writeChar(){
    var e = popStack();
    writeToOutput(String.fromCharCode(e));
    writeToStack();
}
function move(){ //bridge calls this
    if(!INSTANT) unhighlightCurrentCell();
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
    if(!INSTANT) highlightNextCell();
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
}
function userInt(){
    throw new Error(`Int input not implemented`)
}
function userChar(){
    throw new Error(`Char input not implemented`)
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
                userInt();
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

function createStackString(){
    if(stack.length<16){
        return [...stack].reverse().map(i=>i.toString().padStart(3,' ')).join('  ')
    }else{
        return `${stack.slice(-11).reverse().map(i=>i.toString().padStart(3,' ')).join('  ')}  ...  ${stack.slice(0,3).reverse().map(i=>i.toString().padStart(3,' ')).join('  ')}`
    }
}
//#endregion processing functions
// Move the cursor up N lines: \033[<N>A
// Move the cursor down N lines: \033[<N>B
// Move the cursor forward N columns: \033[<N>C
// Move the cursor backward N columns: \033[<N>D
//#region GUI methods
cursorTo = (r,d) => `\x1b[${d};${r}H`
cursorUp = (c) => `\x1b[${c}A`
cursorDown = (c) => `\x1b[${c}B`
cursorRight = (c) => `\x1b[${c}C`
cursorLeft = (c) => `\x1b[${c}D`
function initDisplay(){
    out.write(Clear + cursorTo(1,1) + '\u2554' + cursorTo(84,1) + '\u2557' + cursorTo(1,27) + '\u255A' + cursorTo(84,27) + '\u255D'); //TODO remove magic numbers
    //        top left                   top right                   bottom left                 bottom right
    out.write(cursorTo(2,1) + '\u2550'.repeat(82) + cursorTo(2,27) + '\u2550'.repeat(82)); //top and bottom
    // for(var i = 2; i < 27; i++) out.write(cursorTo(1,i) + '\u2016' + cursorTo(84,i) + '\u2016'); //sides
    for(i=0;i<25;i++){ //board content and sides
        out.write(cursorTo(1,i+2) + `\u2016 ${board[i].join('')} \u2016`);
    }
    // out.write(cursorTo(3,2) + POINTERBG + POINTERCOLOR + board[0][0] + Reset); //highlight initial pointer cell
    highlightNextCell();
    writeToStack();
    tickSpinner();
}
function writeToCell(char, x, y){ //for p
    //TODO highlight cells that are put to, then unhighlight on next step
}
function unhighlightCurrentCell(){ //and unhighlight the previous
    if(!useCursorPointer)
        out.write(cursorTo(x+3,y+2) + Reset + board[y][x])
}
function highlightNextCell(){
    if(useCursorPointer)
        out.write(cursorTo(x+3,y+2))
    else
        out.write(cursorTo(x+3,y+2) + POINTERBG + POINTERCOLOR + board[y][x] + Reset + cursorTo(...cursorStorage))
}
function writeToOutput(char){ //for , and .
    //If char is 10, then shift '' to output array and pop
        //redraw entire output panel
    //else append char to output[0]
        //write char to appropriate location
    //Hopefully \n == 10, else i will revisit this
    if(INSTANT){
        out.write(char);
    }else{
        if(char == '\n'){
            output.unshift('')
            output.pop();
            for(var i = OUTPUTHEIGHT-1; i>=0; i--){
                out.write(cursorTo(1,BOARDHEIGHT + (OUTPUTHEIGHT-i) + 3) + Erase + output[i]);
            }
        }else{
            output[0]=output[0]+char;
            out.write(cursorTo(output[0].length, BOARDHEIGHT + OUTPUTHEIGHT + 3) + output[0].at(-1));
        }
    }
}
function writeToStack(){//for pushInt and pushChar
    out.write(cursorTo(1,28) + Erase + 'Stack: ' + createStackString())
}
function writeToStatus(message){ //for ~ and & //TODO more uses?
    if(!INSTANT){
        //redraw entire status line
        //alternatively, print the status left aligned to the right edge of the board, it can coexist with the spinner?
        //accepted input would have to remember to clear whole status line
        out.write(cursorTo(1, BOARDHEIGHT+OUTPUTHEIGHT+4) + Erase + message) //TODO some more consts for ui locations
    }
}
function tickSpinner(){ //uses the status row for a spinner, just for fun (-\|/)
    if(!INSTANT){
        //redraw entire status line
        spinnerState = (spinnerState+1) % spinner.length;
        out.write(cursorTo(1, BOARDHEIGHT + OUTPUTHEIGHT + 4) + spinner[spinnerState]);
        //TODO find a good place to store the cursor, or a way to hide it. 'Hidden does nothing'
        if(!useCursorPointer) out.write(cursorTo(...cursorStorage))
    }
}
//#endregion GUI methods

if(INSTANT){
    while(1) step();
}else{
    initDisplay();
    var interpreter = setInterval(step,100);
}