import { createWorker, Worker } from "tesseract.js";
import { TESSERACT_CONFIG } from "../config/tesseract";
import { OCRResult, ROI } from "../types";

export class OCRService {
  private worker: Worker | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    this.worker = await createWorker(TESSERACT_CONFIG.lang);
    await this.worker.setParameters(TESSERACT_CONFIG.options);

    this.isInitialized = true;
  }

  async processImage(buffer: Buffer, roi?: ROI): Promise<OCRResult> {
    if (!this.worker || !this.isInitialized) {
      throw new Error("OCR worker not initialized");
    }

    const { data } = await this.worker.recognize(buffer, {
      rectangle: roi
        ? {
            top: roi.y,
            left: roi.x,
            width: roi.width,
            height: roi.height,
          }
        : undefined,
    });

    return {
      text: data.text.trim(),
      confidence: data.confidence,
      roi,
    };
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
    }
  }

  getStatus(): { initialized: boolean } {
    return { initialized: this.isInitialized };
  }
}

export const ocrService = new OCRService();
