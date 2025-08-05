import ffmpeg from 'fluent-ffmpeg';
import sharp from 'sharp';
import { ProcessVideoRequest, LoLGameData } from '../types';
import { ocrService } from './ocrService';
import { LOL_ROI_PRESETS } from '../config/tesseract';

export class VideoService {
  async extractFrame(videoPath: string, timeInSeconds: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      
      ffmpeg(videoPath)
        .seekInput(timeInSeconds)
        .frames(1)
        .format('image2pipe')
        .outputOptions('-vcodec png')
        .on('error', reject)
        .pipe()
        .on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        })
        .on('end', () => {
          resolve(Buffer.concat(chunks));
        })
        .on('error', reject);
    });
  }

  async processVideoFrames(request: ProcessVideoRequest): Promise<LoLGameData[]> {
    const { videoPath, startTime = 0, endTime = 60, frameInterval = 1 } = request;
    const results: LoLGameData[] = [];

    for (let time = startTime; time < endTime; time += frameInterval) {
      try {
        const frameBuffer = await this.extractFrame(videoPath, time);
        const processedFrame = await sharp(frameBuffer)
          .resize(1920, 1080)
          .png()
          .toBuffer();

        const gameData = await this.extractGameData(processedFrame, time);
        results.push(gameData);
      } catch (error) {
        console.error(`Error processing frame at ${time}s:`, error);
      }
    }

    return results;
  }

  private async extractGameData(frameBuffer: Buffer, timestamp: number): Promise<LoLGameData> {
    const [timer, blueKills, redKills, blueGold, redGold] = await Promise.all([
      ocrService.processImage(frameBuffer, LOL_ROI_PRESETS.timer),
      ocrService.processImage(frameBuffer, LOL_ROI_PRESETS.blueKills),
      ocrService.processImage(frameBuffer, LOL_ROI_PRESETS.redKills),
      ocrService.processImage(frameBuffer, LOL_ROI_PRESETS.blueGold),
      ocrService.processImage(frameBuffer, LOL_ROI_PRESETS.redGold)
    ]);

    return {
      timer: timer.text,
      blueKills: parseInt(blueKills.text) || 0,
      redKills: parseInt(redKills.text) || 0,
      blueGold: blueGold.text || "0",
      redGold: redGold.text || "0",
      timestamp
    };
  }

  private parseGold(goldText: string): number {
    const cleaned = goldText.replace(/[^0-9.k]/gi, '');
    if (cleaned.includes('k')) {
      return parseFloat(cleaned.replace('k', '')) * 1000;
    }
    return parseInt(cleaned) || 0;
  }
}

export const videoService = new VideoService();