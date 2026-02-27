
import * as pdfjsModule from 'pdfjs-dist';

const MAX_PAGES = 15;

// Helper to safely get the library instance
const getPdfLib = () => {
    // @ts-ignore
    const lib = pdfjsModule.default || pdfjsModule;
    if (!lib) {
        throw new Error("PDFJS library failed to load");
    }
    return lib;
};

const configureWorker = () => {
    try {
        const lib = getPdfLib();
        if (lib.GlobalWorkerOptions && !lib.GlobalWorkerOptions.workerSrc) {
            lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
    } catch (e) {
        console.warn("Could not configure PDF worker automatically:", e);
    }
};

/**
 * Extracts text from PDF with non-blocking async yielding.
 */
export const extractTextFromPdf = async (file: File): Promise<string> => {
  try {
    configureWorker();
    const lib = getPdfLib();
    
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = lib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    
    if (pdf.numPages > MAX_PAGES) {
        throw new Error(`PDF is too large (${pdf.numPages} pages). Please upload a document with 15 pages or fewer.`);
    }

    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      // Yield to main thread to prevent UI freezing
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        // @ts-ignore
        .filter((item: any) => typeof item.str === 'string')
        // @ts-ignore
        .map((item: any) => item.str)
        .join(' ');
        
      fullText += pageText + '\n\n';
      
      // Clean up page resources
      page.cleanup();
    }

    return fullText;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    let errorMessage = error instanceof Error ? error.message : 'Failed to read PDF file.';
    throw new Error(errorMessage);
  }
};
