export interface OCRRequest {
  image?: Buffer;
  videoPath?: string;
  frameTime?: number;
  roi?: ROI;
}

export interface ROI {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OCRResult {
  text: string;
  confidence: number;
  timestamp?: number;
  roi?: ROI;
}

export interface LoLGameData {
  timer: string;
  blueKills: number;
  redKills: number;
  blueGold: string;
  redGold: string;
  timestamp: number;
}

export interface ProcessVideoRequest {
  videoPath: string;
  startTime?: number;
  endTime?: number;
  frameInterval?: number;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}