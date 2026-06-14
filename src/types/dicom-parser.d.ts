declare module 'dicom-parser' {
  export interface Element {
    tag: string;
    vr?: string;
    length: number;
    dataOffset: number;
  }

  export interface DataSet {
    byteArray: Uint8Array;
    elements: Record<string, Element>;
    
    string(tag: string, index?: number): string | undefined;
    uint16(tag: string, index?: number): number;
    floatString(tag: string, index?: number): string | undefined;
    int16(tag: string, index?: number): number;
  }

  export function parseDicom(byteArray: Uint8Array, options?: any): DataSet;
}
