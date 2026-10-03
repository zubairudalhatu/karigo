import { BadRequestException } from "@nestjs/common";
import { inspectCreative, stripJpegMetadata } from "./ad-creative.service";

describe("ad creative validation", () => {
  it("accepts a sufficiently large PNG and rejects unsupported content", () => {
    const png = Buffer.alloc(24); Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]).copy(png); png.write("IHDR", 12, "ascii"); png.writeUInt32BE(1200, 16); png.writeUInt32BE(628, 20);
    expect(inspectCreative(png, "image/png")).toEqual({ width: 1200, height: 628 });
    expect(() => inspectCreative(Buffer.from("svg"), "image/svg+xml")).toThrow(BadRequestException);
  });
  it("rejects MIME mismatch, truncated PNG, HTML, SVG and oversized payloads", () => {
    const fake = Buffer.from("<script>alert(1)</script>");
    for (const mime of ["image/png", "image/jpeg", "text/html", "image/svg+xml"]) expect(() => inspectCreative(fake, mime)).toThrow(BadRequestException);
    expect(() => inspectCreative(Buffer.alloc(5 * 1024 * 1024 + 1), "image/png")).toThrow(BadRequestException);
  });
  it("removes JPEG EXIF APP1 segments", () => {
    const input = Buffer.from([0xff,0xd8,0xff,0xe1,0x00,0x04,0x41,0x42,0xff,0xda,0x00,0x02]);
    expect(stripJpegMetadata(input)).toEqual(Buffer.from([0xff,0xd8,0xff,0xda,0x00,0x02]));
  });
});
