// Web Worker for OpenCV.js image preprocessing
/* eslint-disable no-restricted-globals */

declare function importScripts(...urls: string[]): void;
// Declare OpenCV global type for compiler safety
declare let cv: any;

let isCvLoaded = false;

// Initialize OpenCV.js inside the Web Worker
const initOpenCV = (): Promise<void> => {
  return new Promise((resolve) => {
    if (isCvLoaded) {
      resolve();
      return;
    }

    // Module object required by OpenCV.js to detect runtime ready state
    (self as any).Module = {
      onRuntimeInitialized: () => {
        isCvLoaded = true;
        resolve();
      }
    };

    // Load the local static opencv.js from the public directory
    try {
      importScripts('/js/opencv.js');
    } catch (e) {
      console.error('Failed to importScripts opencv.js inside worker', e);
    }
  });
};

// Listen for processing jobs from the main thread
self.addEventListener('message', async (e: MessageEvent) => {
  const { type, imageData, options } = e.data;

  if (type === 'process_image') {
    try {
      // 1. Ensure OpenCV is initialized
      await initOpenCV();
      
      // 2. Perform image processing steps
      const processedData = preprocessImage(imageData, options);
      
      // 3. Post the result back
      self.postMessage({
        type: 'success',
        imageData: processedData
      }, [processedData.data.buffer] as any); // Use Transferable Objects for high performance
    } catch (err: any) {
      self.postMessage({
        type: 'error',
        error: err.message || 'Error processing image in worker'
      });
    }
  }
});

function preprocessImage(
  imageData: ImageData, 
  options: { contrast?: number; binarizationBlock?: number; binarizationC?: number }
): ImageData {
  // Load ImageData into cv.Mat
  const src = cv.matFromImageData(imageData);
  let dst = new cv.Mat();

  // Step 1: Grayscale (Escala de grises)
  cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);

  // Step 2: Noise Removal (Bilateral filter or Gaussian Blur)
  // Gaussian Blur is faster and works well for OCR text
  const blurred = new cv.Mat();
  cv.GaussianBlur(dst, blurred, new cv.Size(3, 3), 0, 0, cv.BORDER_DEFAULT);
  dst.delete();
  dst = blurred;

  // Step 3: Contrast Adjustment (Aumento de contraste)
  // Custom linear contrast adjustment: dst = dst * alpha + beta
  const alpha = options.contrast || 1.2; // Contrast factor (1.0 = normal)
  const beta = 10; // Brightness offset
  const contrasted = new cv.Mat();
  dst.convertTo(contrasted, -1, alpha, beta);
  dst.delete();
  dst = contrasted;

  // Step 4: Perspective Correction (Corrección de perspectiva)
  // Let's attempt to find the largest quadrilateral contour and warp it.
  const warped = attemptPerspectiveCorrection(dst);
  if (warped) {
    dst.delete();
    dst = warped;
  }

  // Step 5: Binarization (Binarización adaptativa)
  // Adaptive thresholding is ideal for documents with non-uniform lighting
  const binarized = new cv.Mat();
  const blockSize = options.binarizationBlock || 15; // Size of pixel neighborhood
  const C = options.binarizationC || 5; // Constant subtracted from mean
  cv.adaptiveThreshold(
    dst,
    binarized,
    255,
    cv.ADAPTIVE_THRESH_GAUSSIAN_C,
    cv.THRESH_BINARY,
    blockSize,
    C
  );
  dst.delete();
  dst = binarized;

  // Convert processed Mat back to RGBA for canvas rendering
  const resultMat = new cv.Mat();
  cv.cvtColor(dst, resultMat, cv.COLOR_GRAY2RGBA);

  // Convert back to ImageData
  const processedImgData = new ImageData(
    new Uint8ClampedArray(resultMat.data),
    resultMat.cols,
    resultMat.rows
  );

  // Cleanup OpenCV objects in memory to prevent leaks!
  src.delete();
  dst.delete();
  resultMat.delete();

  return processedImgData;
}

/**
 * Tries to find the 4 corners of a sheet of paper / document and warps the perspective.
 * If no clear quad contour is found, returns null so the original image is preserved.
 */
function attemptPerspectiveCorrection(grayMat: any): any | null {
  // Edge detection
  const edged = new cv.Mat();
  cv.Canny(grayMat, edged, 75, 200, 3, false);

  // Find contours
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(edged, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

  let largestContour: any | null = null;
  let maxArea = 0;

  for (let i = 0; i < contours.size(); i++) {
    const cnt = contours.get(i);
    const area = cv.contourArea(cnt);
    // Document should occupy a reasonable portion of the image (e.g. > 15%)
    const imgArea = grayMat.cols * grayMat.rows;
    if (area > maxArea && area > imgArea * 0.15) {
      // Approximate contour to polygon
      const peri = cv.arcLength(cnt, true);
      const approx = new cv.Mat();
      cv.approxPolyDP(cnt, approx, 0.02 * peri, true);
      
      // If approximated polygon has 4 points, it's a quad!
      if (approx.rows === 4) {
        if (largestContour) largestContour.delete();
        largestContour = approx;
        maxArea = area;
      } else {
        approx.delete();
      }
    }
    cnt.delete();
  }

  edged.delete();
  contours.delete();
  hierarchy.delete();

  if (!largestContour) {
    return null;
  }

  // Order points: [top-left, top-right, bottom-right, bottom-left]
  const pts = getOrderedPoints(largestContour);
  largestContour.delete();

  if (!pts) return null;

  const [tl, tr, br, bl] = pts;

  // Compute width and height of new warped image
  const widthA = Math.sqrt(Math.pow(br.x - bl.x, 2) + Math.pow(br.y - bl.y, 2));
  const widthB = Math.sqrt(Math.pow(tr.x - tl.x, 2) + Math.pow(tr.y - tl.y, 2));
  const maxWidth = Math.max(widthA, widthB);

  const heightA = Math.sqrt(Math.pow(tr.x - br.x, 2) + Math.pow(tr.y - br.y, 2));
  const heightB = Math.sqrt(Math.pow(tl.x - bl.x, 2) + Math.pow(tl.y - bl.y, 2));
  const maxHeight = Math.max(heightA, heightB);

  // Dest coordinates
  const dstPtsArray = [
    0, 0,
    maxWidth - 1, 0,
    maxWidth - 1, maxHeight - 1,
    0, maxHeight - 1
  ];

  // Mat source and dest points
  const srcCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [
    tl.x, tl.y,
    tr.x, tr.y,
    br.x, br.y,
    bl.x, bl.y
  ]);
  const dstCoords = cv.matFromArray(4, 1, cv.CV_32FC2, dstPtsArray);

  // Perform Perspective Warp
  const M = cv.getPerspectiveTransform(srcCoords, dstCoords);
  const warped = new cv.Mat();
  cv.warpPerspective(grayMat, warped, M, new cv.Size(maxWidth, maxHeight));

  // Cleanup
  srcCoords.delete();
  dstCoords.delete();
  M.delete();

  return warped;
}

interface Point {
  x: number;
  y: number;
}

function getOrderedPoints(approxContour: any): Point[] | null {
  const points: Point[] = [];
  for (let i = 0; i < 4; i++) {
    points.push({
      x: approxContour.data32S[i * 2],
      y: approxContour.data32S[i * 2 + 1]
    });
  }

  // Sort by x + y to find top-left (min sum) and bottom-right (max sum)
  // Sort by y - x to find top-right (min diff) and bottom-left (max diff)
  const sum = points.map(p => ({ p, val: p.x + p.y }));
  sum.sort((a, b) => a.val - b.val);
  const tl = sum[0].p;
  const br = sum[3].p;

  const diff = points.map(p => ({ p, val: p.y - p.x }));
  diff.sort((a, b) => a.val - b.val);
  const tr = diff[0].p;
  const bl = diff[3].p;

  // Validation: ensure we have 4 distinct points
  if (tl === br || tr === bl || tl === tr || br === bl) {
    return null;
  }

  return [tl, tr, br, bl];
}
