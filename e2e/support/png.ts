const SIGNATURE = '89504e470d0a1a0a';

/** Reads the pixel size from the header of a PNG file. */
export function pngSize(file: Buffer): { width: number; height: number } {
  if (file.subarray(0, 8).toString('hex') !== SIGNATURE) throw new Error('This is not a PNG file');
  return { width: file.readUInt32BE(16), height: file.readUInt32BE(20) };
}
