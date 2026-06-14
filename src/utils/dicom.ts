import * as dicomParser from 'dicom-parser';

/**
 * Converts a DICOM (.dcm/.dicom) file to a compressed JPEG File object on the client side.
 * Supports MONOCHROME1, MONOCHROME2, and RGB photometric interpretations.
 * Handles bitsAllocated 8 and 16, signed/unsigned pixel representation,
 * and applies window center / window width scaling (with local min/max fallback).
 */
export async function convertDicomToJpeg(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const byteArray = new Uint8Array(arrayBuffer);
        const dataSet = dicomParser.parseDicom(byteArray);
        
        const width = dataSet.uint16('x00280011');
        const height = dataSet.uint16('x00280010');
        const bitsAllocated = dataSet.uint16('x00280100');
        const pixelRepresentation = dataSet.uint16('x00280103');
        const rescaleIntercept = dataSet.floatString('x00281052') !== undefined ? parseFloat(dataSet.floatString('x00281052')!) : 0;
        const rescaleSlope = dataSet.floatString('x00281053') !== undefined ? parseFloat(dataSet.floatString('x00281053')!) : 1;
        
        let windowCenter: number | undefined;
        let windowWidth: number | undefined;
        
        const wcStr = dataSet.string('x00281050');
        const wwStr = dataSet.string('x00281051');
        if (wcStr) {
          const firstWc = wcStr.split('\\')[0];
          windowCenter = parseFloat(firstWc);
        }
        if (wwStr) {
          const firstWw = wwStr.split('\\')[0];
          windowWidth = parseFloat(firstWw);
        }
        
        const photometricInterpretation = dataSet.string('x00280004') || 'MONOCHROME2';
        
        const pixelDataElement = dataSet.elements.x7fe00010;
        if (!pixelDataElement) {
          throw new Error('Sem dados de pixel encontrados no arquivo DICOM.');
        }
        
        // Ensure proper alignment by copying byte array chunk
        const pixelDataBytes = new Uint8Array(
          arrayBuffer,
          pixelDataElement.dataOffset,
          pixelDataElement.length
        );
        const alignedBuffer = pixelDataBytes.buffer.slice(
          pixelDataBytes.byteOffset,
          pixelDataBytes.byteOffset + pixelDataBytes.byteLength
        );
        
        let pixelData: any;
        if (bitsAllocated === 8) {
          pixelData = new Uint8Array(alignedBuffer);
        } else if (bitsAllocated === 16) {
          if (pixelRepresentation === 1) {
            pixelData = new Int16Array(alignedBuffer);
          } else {
            pixelData = new Uint16Array(alignedBuffer);
          }
        } else {
          throw new Error(`Bits Allocated de ${bitsAllocated} não é suportado.`);
        }
        
        // Draw to offscreen canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Não foi possível obter contexto 2D do canvas.');
        
        const imgData = ctx.createImageData(width, height);
        
        if (photometricInterpretation.includes('RGB')) {
          // Standard 8-bit RGB DICOM
          for (let i = 0; i < pixelData.length / 3; i++) {
            const idx = i * 3;
            const canvasIdx = i * 4;
            imgData.data[canvasIdx] = pixelData[idx];
            imgData.data[canvasIdx + 1] = pixelData[idx + 1];
            imgData.data[canvasIdx + 2] = pixelData[idx + 2];
            imgData.data[canvasIdx + 3] = 255;
          }
        } else {
          // Monochrome
          // Calculate dynamic range if window center/width is missing or invalid
          let minVal = windowCenter !== undefined && windowWidth !== undefined ? windowCenter - windowWidth / 2 : Infinity;
          let maxVal = windowCenter !== undefined && windowWidth !== undefined ? windowCenter + windowWidth / 2 : -Infinity;
          
          const hasWindow = windowCenter !== undefined && windowWidth !== undefined && !isNaN(windowCenter) && !isNaN(windowWidth);
          
          if (!hasWindow) {
            let minP = Infinity;
            let maxP = -Infinity;
            for (let i = 0; i < pixelData.length; i++) {
              const modalityValue = pixelData[i] * rescaleSlope + rescaleIntercept;
              if (modalityValue < minP) minP = modalityValue;
              if (modalityValue > maxP) maxP = modalityValue;
            }
            minVal = minP;
            maxVal = maxP;
          }
          
          const range = maxVal - minVal || 1;
          const isMonochrome1 = photometricInterpretation === 'MONOCHROME1';
          
          for (let i = 0; i < pixelData.length; i++) {
            const rawVal = pixelData[i];
            const modalityValue = rawVal * rescaleSlope + rescaleIntercept;
            let val = ((modalityValue - minVal) / range) * 255;
            val = Math.max(0, Math.min(255, val));
            
            if (isMonochrome1) {
              val = 255 - val;
            }
            
            const canvasIdx = i * 4;
            imgData.data[canvasIdx] = val;
            imgData.data[canvasIdx + 1] = val;
            imgData.data[canvasIdx + 2] = val;
            imgData.data[canvasIdx + 3] = 255;
          }
        }
        
        ctx.putImageData(imgData, 0, 0);
        
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Erro ao converter o canvas em JPEG.'));
            return;
          }
          // Create a new File from the blob
          const newFileName = file.name.replace(/\.(dcm|dicom)$/i, '') + '.jpg';
          const convertedFile = new File([blob], newFileName, { type: 'image/jpeg' });
          resolve(convertedFile);
        }, 'image/jpeg', 0.85); // 85% JPEG quality compression
        
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo DICOM.'));
    reader.readAsArrayBuffer(file);
  });
}

export interface FileWithMetadata {
  file: File;
  isDicom: boolean;
  instanceNumber?: number;
  sliceLocation?: number;
  imagePositionZ?: number;
  fileName: string;
}

/**
 * Extracts metadata useful for sorting from a DICOM file (Instance Number, Slice Location, Image Position Patient Z coordinate).
 * Returns fallback values for standard images.
 */
export async function getDicomSortMetadata(file: File): Promise<FileWithMetadata> {
  const isDicom = 
    file.name.toLowerCase().endsWith('.dcm') || 
    file.name.toLowerCase().endsWith('.dicom') || 
    file.type === 'application/dicom';

  if (!isDicom) {
    return { file, isDicom: false, fileName: file.name };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const byteArray = new Uint8Array(arrayBuffer);
        const dataSet = dicomParser.parseDicom(byteArray);

        // Tag 0020,0013: Instance Number
        const instStr = dataSet.string('x00200013');
        const instanceNumber = instStr ? parseInt(instStr, 10) : undefined;

        // Tag 0020,1041: Slice Location
        const locStr = dataSet.string('x00201041');
        const sliceLocation = locStr ? parseFloat(locStr) : undefined;

        // Tag 0020,0032: Image Position (Patient) -> "x\\y\\z"
        const posStr = dataSet.string('x00200032');
        let imagePositionZ: number | undefined;
        if (posStr) {
          const parts = posStr.split('\\');
          if (parts.length >= 3) {
            imagePositionZ = parseFloat(parts[2]);
          }
        }

        resolve({
          file,
          isDicom: true,
          instanceNumber: (instanceNumber !== undefined && !isNaN(instanceNumber)) ? instanceNumber : undefined,
          sliceLocation: (sliceLocation !== undefined && !isNaN(sliceLocation)) ? sliceLocation : undefined,
          imagePositionZ: (imagePositionZ !== undefined && !isNaN(imagePositionZ)) ? imagePositionZ : undefined,
          fileName: file.name
        });
      } catch (err) {
        console.warn(`Erro ao ler metadados DICOM de ${file.name}, usando fallback do nome:`, err);
        resolve({ file, isDicom: true, fileName: file.name });
      }
    };
    reader.onerror = () => resolve({ file, isDicom: true, fileName: file.name });
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Sorts an array of FileWithMetadata structures priority-wise by Image Position Z, Slice Location, or Instance Number,
 * falling back to natural numeric filename sorting.
 */
export function sortFilesByDicomMetadata(arr: FileWithMetadata[]): File[] {
  return [...arr].sort((a, b) => {
    // 1. Image Position Z
    if (a.imagePositionZ !== undefined && b.imagePositionZ !== undefined) {
      return a.imagePositionZ - b.imagePositionZ;
    }
    // 2. Slice Location
    if (a.sliceLocation !== undefined && b.sliceLocation !== undefined) {
      return a.sliceLocation - b.sliceLocation;
    }
    // 3. Instance Number
    if (a.instanceNumber !== undefined && b.instanceNumber !== undefined) {
      return a.instanceNumber - b.instanceNumber;
    }
    // 4. Filename
    return a.fileName.localeCompare(b.fileName, undefined, { numeric: true, sensitivity: 'base' });
  }).map(item => item.file);
}
