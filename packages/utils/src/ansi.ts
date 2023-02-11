export const COLOR_ENABLED = typeof process !== 'undefined' ? !process.env.NODE_DISABLE_COLORS && (!process.env.NO_COLOR || process.env.NO_COLOR == "0") : true;

export const RESET      = COLOR_ENABLED ? '\u001b[0m'  : '';
export const BOLD       = COLOR_ENABLED ? '\u001b[1m'  : '';
export const DIM        = COLOR_ENABLED ? '\u001b[2m'  : '';
export const ITALIC     = COLOR_ENABLED ? '\u001b[3m'  : '';
export const UNDERLINE  = COLOR_ENABLED ? '\u001b[4m'  : '';
export const FG_BLACK   = COLOR_ENABLED ? '\u001b[30m' : '';
export const FG_RED     = COLOR_ENABLED ? '\u001b[31m' : '';
export const FG_GREEN   = COLOR_ENABLED ? '\u001b[32m' : '';
export const FG_YELLOW  = COLOR_ENABLED ? '\u001b[33m' : '';
export const FG_BLUE    = COLOR_ENABLED ? '\u001b[34m' : '';
export const FG_MAGENTA = COLOR_ENABLED ? '\u001b[35m' : '';
export const FG_CYAN    = COLOR_ENABLED ? '\u001b[36m' : '';
export const FG_WHITE   = COLOR_ENABLED ? '\u001b[37m' : '';
export const BG_BLACK   = COLOR_ENABLED ? '\u001b[40m' : '';
export const BG_RED     = COLOR_ENABLED ? '\u001b[41m' : '';
export const BG_GREEN   = COLOR_ENABLED ? '\u001b[42m' : '';
export const BG_YELLOW  = COLOR_ENABLED ? '\u001b[43m' : '';
export const BG_BLUE    = COLOR_ENABLED ? '\u001b[44m' : '';
export const BG_MAGENTA = COLOR_ENABLED ? '\u001b[45m' : '';
export const BG_CYAN    = COLOR_ENABLED ? '\u001b[46m' : '';
export const BG_WHITE   = COLOR_ENABLED ? '\u001b[47m' : '';
