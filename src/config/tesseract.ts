import { PSM, OEM } from "tesseract.js";
import { ROIType, type ROI } from "../types";

export const TESSERACT_CONFIG = {
  lang: "eng",
  options: {
     // garde K et le point
     tessedit_char_whitelist: "0123456789:.kK",
     tessedit_pageseg_mode: PSM.SINGLE_LINE,  // à tester aussi: PSM.SINGLE_LINE
     tessedit_ocr_engine_mode: OEM.TESSERACT_LSTM_COMBINED, // <— au lieu de TESSERACT_ONLY
     // supprime le dictionnaire pour éviter des “corrections” non voulues
     load_system_dawg: "0",
     load_freq_dawg: "0",
     // biais numérique
     classify_bln_numeric_mode: "1",
     // indique une résolution “propre”
     user_defined_dpi: "300",
     tessedit_write_images: "1",
  },
};

export const LOL_ROI_PRESETS: Record<string, ROI> = {
  timer: {
    x: 920,
    y: 76,
    width: 70,
    height: 20,
    type: ROIType.TIMER,
  },
  blueKills: {
    x: 865,
    y: 17,
    width: 45,
    height: 32,
    type: ROIType.KILLS,
  },
  redKills: {
    x: 1012,
    y: 17,
    width: 45,
    height: 32,
    type: ROIType.KILLS,
  },
  blueGold: {
    x: 745,
    y: 23,
    width: 75,
    height: 22,
    type: ROIType.GOLD,
  },
  redGold: {
    x: 1098,
    y: 23,
    width: 75,
    height: 22,
    type: ROIType.GOLD,
  },
};

// Utilisation d'une configuration Tesseract unique (pas de surcharges par ROI)
