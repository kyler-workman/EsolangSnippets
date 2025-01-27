import { BgYellow, FgBlack } from './controlCodes.js';

export const BOARDHEIGHT = 25;
export const BOARDWIDTH  = 80;
export const OUTPUTHEIGHT = 5;
export const STEPDELAYMS = process.argv[3] || 100;
export const POINTERCOLOR = FgBlack;
export const POINTERBG = BgYellow;
