import sharp from "sharp";
export default async function preprocess(
  buffer: Buffer,
  origWidth?: number,
  origHeight?: number,
): Promise<Buffer> {
  const factor = 2;

  return await sharp(buffer)
    // éviter le blur; conserver les détails fins (.)
    .resize({
      width: origWidth ? Math.round(origWidth * factor) : undefined,
      height: origHeight ? Math.round(origHeight * factor) : undefined,
      kernel: "lanczos3", // ou "nearest" à essayer
    })
    .grayscale()
    .normalize()
    .gamma(1.1)
    .threshold(100)  // 170–210 à tester; 100 est trop bas ici
    .negate()
    .toBuffer();
}
