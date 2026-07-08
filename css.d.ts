// Ambient declaration so the native TS compiler (tsgo / TS 7) accepts side-effect
// CSS imports like `import './globals.css'`. Classic tsc had this built in; tsgo does not.
declare module '*.css';
