declare module "turndown" {
  interface Options {
    headingStyle?: "setext" | "atx";
    hr?: string;
    bulletListMarker?: "-" | "+" | "*";
    codeBlockStyle?: "indented" | "fenced";
    fence?: "```" | "~~~";
    emDelimiter?: "_" | "*";
    strongDelimiter?: "__" | "**";
    linkStyle?: "inlined" | "referenced";
    linkReferenceStyle?: "full" | "collapsed" | "shortcut";
    [key: string]: unknown;
  }

  class TurndownService {
    constructor(options?: Options);
    turndown(html: string): string;
    use(plugin: any): this;
    addRule(key: string, rule: any): this;
    remove(filter: string | string[] | ((node: any) => boolean)): this;
    keep(filter: string | string[] | ((node: any) => boolean)): this;
    escape(str: string): string;
  }

  export = TurndownService;
}

declare module "pdf-parse" {
  interface PDFData {
    text: string;
    total: number;
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: Record<string, unknown>;
    version: string;
  }

  class PDFParse {
    constructor(options: { data: Buffer | ArrayBuffer | Uint8Array });
    getText(): Promise<PDFData>;
    destroy(): Promise<void>;
  }

  export { PDFParse };
  export default function pdf(dataBuffer: Buffer, options?: any): Promise<PDFData>;
}

declare module "mammoth" {
  interface Message {
    type: string;
    message: string;
  }
  export function extractRawText(options: { buffer: Buffer }): Promise<{ value: string; messages: Message[] }>;
  export function convertToHtml(options: { buffer: Buffer }): Promise<{ value: string; messages: Message[] }>;
}
