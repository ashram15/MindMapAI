// Type declarations that let the frontend import CSS modules without TypeScript errors.

declare module '*.css' {
    const content: {};
    export default content;
}
