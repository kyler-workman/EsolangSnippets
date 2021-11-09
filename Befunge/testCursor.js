var fs = require('fs')

var usr = process.stdin;
var out = process.stdout;

// function getChar() {
//     let buffer = Buffer.alloc(1)
//     fs.readSync(0, buffer, 0, 1)
//     return buffer.toString('utf8')
// }

//get stream always, withut needing enter
usr.setRawMode(true);
//make node never quit, unless process.exit or an error happens
usr.resume();
//real stuff
usr.setEncoding('utf8')

usr.on('data', k =>{
    if(k == '\u0003') //ctrl-c
        process.exit();
    out.write(k);
    // console.log(k.toString('utf8').charCodeAt());
    // out.write(Buffer.from(k.toString('utf8').charCodeAt().toString()));
});

//Does not do what i want, process ends after it reads
// usr.on('readable', _=>{
//     out.write(String(usr.read()));
// });

out.write('\033[2J\033[0;0H')
out.write('..........\033[1E')
out.write('..........\033[1E')
out.write('..........\033[1E')
out.write('..........\033[1E')
out.write('..........\033[1E')
// out.write('\033[2;2H')
// out.write('test')
out.write('\033[1;1H')
out.write('test')
// getChar()



// Position the Cursor: \033[<L>;<C>H or \033[<L>;<C>f (puts the cursor at line L and column C)
// Move the cursor up N lines: \033[<N>A
// Move the cursor down N lines: \033[<N>B
// Move the cursor forward N columns: \033[<N>C
// Move the cursor backward N columns: \033[<N>D
// Clear the screen, move to (0,0): \033[2J
// Erase to end of line: \033[K
// Save cursor position: \033[s
// Restore cursor position: \033[u