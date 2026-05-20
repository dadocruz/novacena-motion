import * as opentype from 'opentype.js';

function toArrayBuffer(data: ArrayBuffer | ArrayBufferView): ArrayBuffer {
  if (data instanceof ArrayBuffer) return data;

  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
}

function hasKnownSignature(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;

  const sig = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  const isTtf = bytes[0] === 0x00 && bytes[1] === 0x01 && bytes[2] === 0x00 && bytes[3] === 0x00;
  const isOtto = sig === 'OTTO';
  const isWoff = sig === 'wOFF';
  const isWoff2 = sig === 'wOF2';

  return isTtf || isOtto || isWoff || isWoff2;
}

export function isValidFontData(data: ArrayBuffer | ArrayBufferView): boolean {
  const arrayBuffer = toArrayBuffer(data);
  const bytes = new Uint8Array(arrayBuffer);

  if (!hasKnownSignature(bytes)) return false;

  const sig = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);

  if (sig === 'wOF2') {
    return true;
  }

  try {
    const font = opentype.parse(arrayBuffer);
    return Boolean(font?.numGlyphs && font.numGlyphs > 0);
  } catch {
    return false;
  }
}
