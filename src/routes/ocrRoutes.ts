import { FastifyInstance, FastifyRequest } from "fastify";
import { ocrService } from "../services/ocrService";
import { videoService } from "../services/videoService";
import { OCRRequest, ProcessVideoRequest, APIResponse } from "../types";

export async function ocrRoutes(fastify: FastifyInstance) {
  fastify.post("/ocr/image", async (request, reply) => {
    try {
      const data = await request.file();
      if (!data) {
        return reply.code(400).send({
          success: false,
          error: "No image file provided",
          timestamp: Date.now(),
        } as APIResponse);
      }

      const buffer = await data.toBuffer();
      const result = await ocrService.processImage(buffer);

      return {
        success: true,
        data: result,
        timestamp: Date.now(),
      } as APIResponse;
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: Date.now(),
      } as APIResponse);
    }
  });

  fastify.post<{ Body: ProcessVideoRequest }>(
    "/ocr/video",
    async (request, reply) => {
      try {
        const { videoPath, startTime, endTime, frameInterval } = request.body;

        if (!videoPath) {
          return reply.code(400).send({
            success: false,
            error: "Video path is required",
            timestamp: Date.now(),
          } as APIResponse);
        }

        const results = await videoService.processVideoFrames({
          videoPath,
          startTime,
          endTime,
          frameInterval,
        });

        return {
          success: true,
          data: results,
          timestamp: Date.now(),
        } as APIResponse;
      } catch (error) {
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: Date.now(),
        } as APIResponse);
      }
    },
  );

  fastify.get("/ocr/status", async (request, reply) => {
    const status = ocrService.getStatus();
    return {
      success: true,
      data: status,
      timestamp: Date.now(),
    } as APIResponse;
  });

  fastify.post("/ocr/test-rois", async (request, reply) => {
    try {
      const data = await request.file();
      if (!data) {
        return reply.code(400).send({
          success: false,
          error: "No image file provided",
          timestamp: Date.now(),
        } as APIResponse);
      }

      const buffer = await data.toBuffer();
      const { LOL_ROI_PRESETS } = await import("../config/tesseract");

      const results: Record<string, any> = {};

      for (const [name, roi] of Object.entries(LOL_ROI_PRESETS)) {
        try {
          const result = await ocrService.processImage(buffer, roi);
          results[name] = {
            text: result.text,
            confidence: result.confidence,
            roi: roi,
          };
        } catch (error) {
          results[name] = {
            error: error instanceof Error ? error.message : "Unknown error",
            roi: roi,
          };
        }
      }

      return {
        success: true,
        data: results,
        timestamp: Date.now(),
      } as APIResponse;
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: Date.now(),
      } as APIResponse);
    }
  });

  fastify.post("/ocr/extract-rois", async (request, reply) => {
    try {
      const data = await request.file();
      if (!data) {
        return reply.code(400).send({
          success: false,
          error: "No image file provided",
          timestamp: Date.now(),
        } as APIResponse);
      }

      const buffer = await data.toBuffer();
      const { LOL_ROI_PRESETS } = await import("../config/tesseract");
      const sharp = require("sharp");
      const fs = require("fs");

      const results: Record<string, any> = {};

      for (const [name, roi] of Object.entries(LOL_ROI_PRESETS)) {
        try {
          // Extract ROI as separate image
          const roiBuffer = await sharp(buffer)
            .extract({
              left: roi.x,
              top: roi.y,
              width: roi.width,
              height: roi.height,
            })
            .png()
            .toBuffer();

          // Save ROI image for debugging
          fs.writeFileSync(`debug_${name}.png`, roiBuffer);

          // Preprocess ROI (scale up + enhance contrast)
          const processedROI = await sharp(roiBuffer)
            .resize(roi.width * 4, roi.height * 4, { kernel: 'nearest' })
            .normalize()
            .threshold(128)
            .png({ density: 300 }) // Set DPI to avoid warning
            .toBuffer();

          // Save processed version
          fs.writeFileSync(`debug_${name}_processed.png`, processedROI);

          // Test OCR on processed ROI
          const result = await ocrService.processImage(processedROI);
          results[name] = {
            text: result.text,
            confidence: result.confidence,
            roi: roi,
            saved_as: `debug_${name}.png`,
            processed_as: `debug_${name}_processed.png`,
          };
        } catch (error) {
          results[name] = {
            error: error instanceof Error ? error.message : "Unknown error",
            roi: roi,
          };
        }
      }

      return {
        success: true,
        data: results,
        timestamp: Date.now(),
      } as APIResponse;
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: Date.now(),
      } as APIResponse);
    }
  });

  fastify.post("/ocr/debug-overlay", async (request, reply) => {
    try {
      const data = await request.file();
      if (!data) {
        return reply.code(400).send({
          success: false,
          error: "No image file provided",
          timestamp: Date.now(),
        } as APIResponse);
      }

      const buffer = await data.toBuffer();
      const { LOL_ROI_PRESETS } = await import("../config/tesseract");
      const sharp = require("sharp");
      const fs = require("fs");

      // Get image dimensions
      const image = sharp(buffer);
      const { width, height } = await image.metadata();

      // Create SVG overlay
      const colors = ['red', 'blue', 'green', 'orange', 'purple'];
      let rectangles = '';
      let labels = '';
      
      Object.entries(LOL_ROI_PRESETS).forEach(([name, roi]: [string, any], index) => {
        const color = colors[index % colors.length];
        
        rectangles += `
          <rect x="${roi.x}" y="${roi.y}" width="${roi.width}" height="${roi.height}" 
                fill="none" stroke="${color}" stroke-width="3" opacity="0.9"/>
        `;
        
        labels += `
          <text x="${roi.x}" y="${roi.y - 8}" fill="${color}" font-size="16" font-weight="bold" 
                stroke="white" stroke-width="1">
            ${name} (${roi.x},${roi.y})
          </text>
        `;
      });

      const svgOverlay = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          ${rectangles}
          ${labels}
        </svg>
      `;

      // Create overlay image
      const overlayImage = await image
        .composite([{
          input: Buffer.from(svgOverlay),
          top: 0,
          left: 0
        }])
        .png()
        .toBuffer();

      // Save overlay image
      fs.writeFileSync('debug_overlay.png', overlayImage);

      return {
        success: true,
        data: {
          image_dimensions: { width, height },
          roi_presets: LOL_ROI_PRESETS,
          overlay_saved: 'debug_overlay.png'
        },
        timestamp: Date.now(),
      } as APIResponse;
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: Date.now(),
      } as APIResponse);
    }
  });
}
