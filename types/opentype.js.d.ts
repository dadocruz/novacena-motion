declare module 'opentype.js' {
  const opentype: {
    parse(buffer: ArrayBuffer): { numGlyphs?: number };
  };

  export = opentype;
}
