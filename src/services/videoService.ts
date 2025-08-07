import ffmpeg from "fluent-ffmpeg";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { ProcessVideoRequest, LoLGameData } from "../types";
import { ocrService } from "./ocrService";
import { LOL_ROI_PRESETS } from "../config/tesseract";
import preprocess from "../utils/process";
import { ROI } from "../types";

export class VideoService {
  private debugMode = process.env.DEBUG_FRAMES === "true";
  private debugDir = "debug-frames";

  constructor() {
    if (this.debugMode) {
      this.ensureDebugDir();
    }
  }

  private ensureDebugDir(): void {
    if (!fs.existsSync(this.debugDir)) {
      fs.mkdirSync(this.debugDir, { recursive: true });
    }
  }

  async extractFrame(
    videoPath: string,
    timeInSeconds: number,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      ffmpeg(videoPath)
        .seekInput(timeInSeconds)
        .frames(1)
        .format("image2pipe")
        .outputOptions("-vcodec png")
        .on("error", reject)
        .pipe()
        .on("data", (chunk: Buffer) => {
          chunks.push(chunk);
        })
        .on("end", () => {
          resolve(Buffer.concat(chunks));
        })
        .on("error", reject);
    });
  }

  async processVideoFrames(
    request: ProcessVideoRequest,
  ): Promise<LoLGameData[]> {
    const {
      videoPath,
      startTime = 0,
      endTime = 60,
      frameInterval = 1,
    } = request;
    const results: LoLGameData[] = [];

    for (let time = startTime; time < endTime; time += frameInterval) {
      try {
        const frameBuffer = await this.extractFrame(videoPath, time);
        const frame = await sharp(frameBuffer)
          .resize(1920, 1080)
          .png()
          .toBuffer();

        // Debug: sauvegarder la frame si mode debug activé
        if (this.debugMode) {
          await this.saveDebugFrame(frame, time);
          // Extraire et sauvegarder chaque ROI pour debug
          for (const [roiName, roi] of Object.entries(LOL_ROI_PRESETS)) {
            const roiBuffer = await this.extractROI(frame, roi, roiName);
            const roiFilename = `roi_${roiName}_${time.toFixed(1).replace(".", "_")}s.png`;
            const roiFilepath = path.join(this.debugDir, roiFilename);
            const processedROI = await preprocess(roiBuffer);
            await fs.promises.writeFile(roiFilepath, processedROI);
            console.log(`🎯 ROI extraite: ${roiFilename}`);
          }
        }

        const gameData = await this.extractGameData(frame, time);
        results.push(gameData);
      } catch (error) {
        console.error(`Error processing frame at ${time}s:`, error);
      }
    }

    return results;
  }

  private async extractGameData(
    frameBuffer: Buffer,
    timestamp: number,
  ): Promise<LoLGameData> {
    const [timer, blueKills, redKills, blueGold, redGold] = await Promise.all(
      Object.keys(LOL_ROI_PRESETS).map(async (key) => {
        const roiFrame = await this.extractROI(
          frameBuffer,
          LOL_ROI_PRESETS[key as keyof typeof LOL_ROI_PRESETS],
          key,
        );
        return ocrService.processImage(
          roiFrame,
          LOL_ROI_PRESETS[key as keyof typeof LOL_ROI_PRESETS],
        );
      }),
    );

    return {
      timer: timer.text,
      blueKills: parseInt(blueKills.text) || 0,
      redKills: parseInt(redKills.text) || 0,
      blueGold: blueGold.text || "0",
      redGold: redGold.text || "0",
      timestamp,
    };
  }

  private async saveDebugFrame(
    frameBuffer: Buffer,
    timestamp: number,
  ): Promise<void> {
    try {
      const filename = `frame_${timestamp.toFixed(1).replace(".", "_")}s.png`;
      const filepath = path.join(this.debugDir, filename);
      await fs.promises.writeFile(filepath, frameBuffer);
      console.log(`🎬 Debug frame sauvegardée: ${filename}`);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde debug frame:", error);
    }
  }

  private async extractROI(
    frameBuffer: Buffer,
    roi: ROI,
    roiName: string,
  ): Promise<Buffer> {
    return sharp(frameBuffer)
      .extract({
        left: roi.x,
        top: roi.y,
        width: roi.width,
        height: roi.height,
      })
      .png()
      .toBuffer();
  }

  private parseGold(goldText: string): number {
    const cleaned = goldText.replace(/[^0-9.k]/gi, "");
    if (cleaned.includes("k")) {
      return parseFloat(cleaned.replace("k", "")) * 1000;
    }
    return parseInt(cleaned) || 0;
  }
}

export const videoService = new VideoService();
