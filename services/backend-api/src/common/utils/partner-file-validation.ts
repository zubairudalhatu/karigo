import { BadRequestException } from "@nestjs/common";
interface File { mimetype: string; buffer: Buffer; size: number; }
const MIME = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
export function validatePartnerDocument(file?: File) {
  if (!file || !MIME.has(file.mimetype) || !file.buffer || file.buffer.length !== file.size || file.size < 1 || file.size > 10 * 1024 * 1024) throw new BadRequestException("Choose a PDF, JPG, PNG or WebP file up to 10 MB.");
  const b = file.buffer;
  const valid = file.mimetype === "application/pdf" ? b.subarray(0, 5).toString() === "%PDF-"
    : file.mimetype === "image/jpeg" ? b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff
    : file.mimetype === "image/png" ? b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    : b.subarray(0,4).toString() === "RIFF" && b.subarray(8,12).toString() === "WEBP";
  if (!valid) throw new BadRequestException("The file content does not match its type.");
}
