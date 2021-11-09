
var fs = require('fs');
const { StringDecoder } = require('string_decoder');

//TODO change how filename is detected, might not be last?

var BOARDHEIGHT = 25,
    BOARDWIDTH  = 80;

var divideByZeroThrows = true; //TODO flag to change the behavior of /0 based on spec.
var x = 0,
    y = 0;
var direction = 'r';
var stack = [];
var stringMode = false;
var board = process.argv[2]
? loadBoardFromFile(process.argv[2])
: new Array(25).fill(new Array(80).fill(' '));

function printBoard(){
    console.log(`\u2554${"\u2550".repeat(82)}\u2557`);
    for(var row of board)
        console.log(`\u2016 ${row.join('')} \u2016`);
    console.log(`\u255A${"\u2550".repeat(82)}\u255d`);
}

//TODO test lines too long
//TODO test too many lines
function loadBoardFromFile(fileName){
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

var popStack = () => stack.pop() || 0;
var pushInt = int => stack.push(int);
var pushChar = char => stack.push(char.charCodeAt());
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
function discard(){ popStack(); }
function writeInt(){
    var e = popStack()
    process.stdout.write(e.toString());
}
function writeChar(){
    var e = popStack();
    process.stdout.write(String.fromCharCode(e));
}
function move(){ //bridge calls this
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
    board[y][x] = String.fromCharCode(e);
}
function userInt(){
    throw new Error(`Int input not implemented`)
}
function userChar(){
    throw new Error(`Char input not implemented`)
}

printBoard();

while(1){
    //execute the current location
    //move in proper direction, wrap if needed
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

    if(direction == 'x')
        break;
    else
        move();
}