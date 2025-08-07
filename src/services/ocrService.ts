import { createWorker, Worker, PSM } from "tesseract.js";
import { TESSERACT_CONFIG } from "../config/tesseract";
import { OCRResult, ROI, ROIType } from "../types";
import preprocess from "../utils/process";
import fs from "fs";

export class OCRService {
  private workers: Partial<Record<ROIType, Worker>> = {};
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Whitelists par type de ROI (initialisées une seule fois par worker)
    const whitelists = new Map<ROIType, string>([
      [ROIType.TIMER, "0123456789:"],
      [ROIType.KILLS, "0123456789"],
      [ROIType.GOLD, "0123456789.kK"],
    ]);

    // PSM par type (évite les resets dynamiques)
    const psmByType = new Map<ROIType, PSM>([
      [ROIType.TIMER, PSM.SINGLE_WORD],
      [ROIType.KILLS, PSM.SINGLE_WORD],
      [ROIType.GOLD, PSM.SINGLE_WORD],
    ]);

    const types: ROIType[] = [ROIType.TIMER, ROIType.KILLS, ROIType.GOLD];
    for (const type of types) {
      const worker = await createWorker(TESSERACT_CONFIG.lang);
      const psm = psmByType.get(type) ?? PSM.SINGLE_WORD;
      await worker.setParameters({
        ...TESSERACT_CONFIG.options,
        tessedit_pageseg_mode: psm,
        tessedit_char_whitelist: whitelists.get(type) || "1234567890kK:.",
      });
      this.workers[type] = worker;
    }

    this.isInitialized = true;
  }

  async processImage(buffer: Buffer, roi?: ROI): Promise<OCRResult> {
    if (!this.isInitialized) {
      throw new Error("OCR worker not initialized");
    }

    const preprocessedBuffer = await preprocess(
      buffer,
      roi?.width,
      roi?.height,
    );

    const roiType = roi?.type ?? ROIType.TIMER;
    const worker = this.workers[roiType] || this.workers[ROIType.TIMER];
    if (!worker) {
      throw new Error("No OCR worker available");
    }

    const roiFilepath = roi
      ? `roi_${roi.x}_${roi.y}_${roi.width}_${roi.height}.png`
      : "preprocessed.png";
    await fs.promises.writeFile(roiFilepath, preprocessedBuffer);

    const { data } = await worker.recognize(preprocessedBuffer);

    // Post-traitement: normalisation GOLD pour corriger 151K -> 15.1K, 134K -> 13.4K, etc.
    let textOut = data.text.trim();
    if (roiType === ROIType.GOLD) {
      let t = textOut.replace(/[^0-9.kK]/g, "");
      t = t.replace(/k/g, "K");
      // Si pas de point et forme NNNK, insérer un point avant le dernier chiffre
      if (/^\d{3}K$/.test(t)) {
        t = `${t.slice(0, 2)}.${t.slice(2, 3)}K`;
      }
      // Si point absent et forme NN (sans K), on ne touche pas; si forme NN.N, ajouter K
      if (/^\d{2}\.\d$/.test(t)) {
        t = `${t}K`;
      }
      textOut = t;
    }

    return {
      text: textOut,
      confidence: data.confidence,
      roi,
    };
  }

  async terminate(): Promise<void> {
    const list = Object.values(this.workers).filter(Boolean) as Worker[];
    for (const w of list) {
      await w.terminate();
    }
    this.workers = {};
    this.isInitialized = false;
  }

  getStatus(): { initialized: boolean } {
    return { initialized: this.isInitialized };
  }
}

export const ocrService = new OCRService();
