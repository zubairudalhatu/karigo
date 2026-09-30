import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { randomBytes } from "crypto";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import { extname, join, normalize, resolve } from "path";

export interface PrivateVendorFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class VendorPrivateUploadStorageService {
  private root() {
    return resolve(process.cwd(), "private-uploads");
  }

  async putOnboardingDocument(vendorId: string, file: PrivateVendorFile) {
    const extension = extname(file.originalname).toLowerCase() || this.extensionFor(file.mimetype);
    const key = `vendors/${vendorId}/onboarding-documents/${randomBytes(16).toString("hex")}${extension}`;
    const path = this.pathForOwnedKey(vendorId, key);
    await mkdir(resolve(path, ".."), { recursive: true });
    await writeFile(path, file.buffer, { flag: "wx" });
    return key;
  }

  async readOwnedObject(vendorId: string, key: string) {
    try {
      return await readFile(this.pathForOwnedKey(vendorId, key));
    } catch {
      throw new ServiceUnavailableException("Private Partner document is unavailable.");
    }
  }

  async deleteOwnedObject(vendorId: string, key: string) {
    const path = this.pathForOwnedKey(vendorId, key);
    try {
      await unlink(path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      throw new ServiceUnavailableException("Private Partner document could not be removed from storage.");
    }
  }

  assertOwnedKey(vendorId: string, key: string) {
    this.pathForOwnedKey(vendorId, key);
  }

  private pathForOwnedKey(vendorId: string, key: string) {
    const expectedPrefix = `vendors/${vendorId}/onboarding-documents/`;
    if (!key.startsWith(expectedPrefix) || key.includes("..") || key.includes("\\")) {
      throw new BadRequestException("Private upload reference is invalid.");
    }
    const relative = normalize(key).replaceAll("\\", "/");
    const path = resolve(this.root(), relative);
    if (!path.startsWith(`${this.root()}\\`) && !path.startsWith(`${this.root()}/`)) {
      throw new BadRequestException("Private upload reference is invalid.");
    }
    return path;
  }

  private extensionFor(mimeType: string) {
    if (mimeType === "application/pdf") return ".pdf";
    if (mimeType === "image/png") return ".png";
    if (mimeType === "image/webp") return ".webp";
    return ".jpg";
  }
}
