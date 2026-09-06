// src/lib/ocr.ts
import Tesseract from 'tesseract.js';

export async function extractTextFromImage(imageInput: string): Promise<string> {
  // Si no hay imagen, retornamos vacío rápido
  if (!imageInput || typeof imageInput !== 'string') return "";

  try {
    // Timeout de seguridad de 15 segundos para el OCR
    const timeoutPromise = new Promise<string>((_, reject) => 
      setTimeout(() => reject(new Error("OCR Timeout")), 15000)
    );

    const ocrPromise = Tesseract.recognize(
      imageInput,
      'eng', // Inglés funciona mejor para números y tablas en BD
      { 
        errorHandler: () => {} // Silenciar errores internos de Tesseract
      }
    ).then(({ data: { text } }) => text);

    // Carrera: OCR vs Timeout
    const text = await Promise.race([ocrPromise, timeoutPromise]);

    // Limpieza básica del texto crudo
    return (text as string)
        .replace(/\n\s*\n/g, '\n') // Quita líneas vacías dobles
        .replace(/[^\x20-\x7E\n]/g, '') // Quita caracteres no imprimibles
        .trim();

  } catch (error) {
    console.error("⚠️ OCR Skipped:", error instanceof Error ? error.message : error);
    return ""; // Retorna vacío para que el sistema siga con la IA visual si el OCR falla
  }
}
