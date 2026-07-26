import multer from "multer";

const maxFileSize = Number(process.env.PLAN_PDF_MAX_FILE_SIZE_BYTES) || 15 * 1024 * 1024;

export const planPdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxFileSize },
  fileFilter: (_req, file, cb) => {
    const isPdf = file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      cb(new Error("Only PDF files are allowed"));
      return;
    }

    cb(null, true);
  },
});
