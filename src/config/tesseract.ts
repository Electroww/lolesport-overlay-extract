import { PSM } from "tesseract.js";

export const TESSERACT_CONFIG = {
  lang: "eng",
  options: {
    tessedit_char_whitelist: "0123456789:.",
    tessedit_pageseg_mode: PSM.SINGLE_WORD,
    tessedit_ocr_engine_mode: 3,
    preserve_interword_spaces: "1",
  },
};

export const TESSERACT_CONFIG_TIMER = {
  lang: "eng",
  options: {
    tessedit_char_whitelist: "0123456789:",
    tessedit_pageseg_mode: PSM.SINGLE_TEXTLINE,
    tessedit_ocr_engine_mode: 3,
  },
};

export const LOL_ROI_PRESETS = {
  timer: {
    x: 920,
    y: 71,
    width: 70,
    height: 20,
  },
  blueKills: {
    x: 850,
    y: 17,
    width: 50,
    height: 32,
  },
  redKills: {
    x: 1012,
    y: 17,
    width: 50,
    height: 32,
  },
  blueGold: {
    x: 745,
    y: 17,
    width: 75,
    height: 30,
  },
  redGold: {
    x: 1098,
    y: 17,
    width: 75,
    height: 30,
  },
};
