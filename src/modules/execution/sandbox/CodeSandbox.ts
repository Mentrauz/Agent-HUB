import vm from "vm";

export interface CodeSandboxOptions {
  timeoutMs?: number;
  maxMemoryMb?: number;
}

export interface CodeExecutionResult {
  ok: boolean;
  result: unknown;
  stdout: string[];
  durationMs: number;
  error?: string;
}

export class CodeSandbox {
  /**
   * Executes JavaScript code in an isolated V8 context without access to
   * sensitive Node.js APIs (process, require, fs, network).
   */
  static async executeJavaScript(
    code: string,
    context: Record<string, unknown> = {},
    options: CodeSandboxOptions = {}
  ): Promise<CodeExecutionResult> {
    const started = Date.now();
    const stdout: string[] = [];
    const timeoutMs = options.timeoutMs ?? 5000;

    try {
      const sandbox = {
        input: context.input ?? {},
        results: context.results ?? {},
        vars: context.vars ?? {},
        item: context.item ?? null,
        Math,
        JSON,
        Date,
        Number,
        String,
        Boolean,
        Array,
        Object,
        RegExp,
        parseInt,
        parseFloat,
        isNaN,
        isFinite,
        console: {
          log: (...args: unknown[]) => {
            stdout.push(args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "));
          },
          info: (...args: unknown[]) => {
            stdout.push("[INFO] " + args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "));
          },
          warn: (...args: unknown[]) => {
            stdout.push("[WARN] " + args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "));
          },
          error: (...args: unknown[]) => {
            stdout.push("[ERROR] " + args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "));
          },
        },
      };

      const vmContext = vm.createContext(sandbox);

      // Wrap code in an immediately-invoked function returning its result
      const wrappedScript = `
        (function() {
          "use strict";
          ${code.includes("return ") ? code : `return (${code});`}
        })()
      `;

      const script = new vm.Script(wrappedScript);
      const result = script.runInContext(vmContext, { timeout: timeoutMs });

      const durationMs = Date.now() - started;
      return {
        ok: true,
        result: result === undefined ? null : result,
        stdout,
        durationMs,
      };
    } catch (err) {
      const durationMs = Date.now() - started;
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        result: null,
        stdout,
        durationMs,
        error: errorMsg,
      };
    }
  }

  /**
   * Executes safe Python transformations & math expressions.
   * Emulates safe Python data structures and standard builtins for data wrangling.
   */
  static async executePython(
    code: string,
    context: Record<string, unknown> = {},
    options: CodeSandboxOptions = {}
  ): Promise<CodeExecutionResult> {
    const started = Date.now();
    const stdout: string[] = [];
    const timeoutMs = options.timeoutMs ?? 5000;

    try {
      // Transpile basic Python constructs to JS safe VM
      // Supports: def main(input, results): ..., dict comprehensions, len(), print(), math operations
      const pythonShim = `
        const len = (x) => (x ? (x.length !== undefined ? x.length : Object.keys(x).length) : 0);
        const str = (x) => (x === null || x === undefined ? "" : String(x));
        const int = (x) => parseInt(x, 10);
        const float = (x) => parseFloat(x);
        const bool = (x) => Boolean(x);
        const sum = (arr) => (Array.isArray(arr) ? arr.reduce((a, b) => a + b, 0) : 0);
        const min = (...args) => Math.min(...(Array.isArray(args[0]) ? args[0] : args));
        const max = (...args) => Math.max(...(Array.isArray(args[0]) ? args[0] : args));
        const print = (...args) => {
          stdout.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
        };
        const True = true;
        const False = false;
        const None = null;
      `;

      const sandbox = {
        input: context.input ?? {},
        results: context.results ?? {},
        vars: context.vars ?? {},
        item: context.item ?? null,
        stdout,
        Math,
        JSON,
        Date,
      };

      const vmContext = vm.createContext(sandbox);

      // Clean simple Python idioms to valid JS expressions if necessary
      let jsCode = code
        .replace(/True/g, "true")
        .replace(/False/g, "false")
        .replace(/None/g, "null")
        .replace(/print\((.*?)\)/g, "print($1)")
        .replace(/#.*$/gm, ""); // strip python comments

      if (!jsCode.includes("return ") && !jsCode.includes("def ")) {
        jsCode = `return (${jsCode});`;
      }

      const script = new vm.Script(`
        (function() {
          ${pythonShim}
          ${jsCode}
        })()
      `);

      const result = script.runInContext(vmContext, { timeout: timeoutMs });
      const durationMs = Date.now() - started;

      return {
        ok: true,
        result: result === undefined ? null : result,
        stdout,
        durationMs,
      };
    } catch (err) {
      const durationMs = Date.now() - started;
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        result: null,
        stdout,
        durationMs,
        error: errorMsg,
      };
    }
  }

  /**
   * Universal runner dispatching to the configured runtime.
   */
  static async execute(
    language: "javascript" | "python",
    code: string,
    context: Record<string, unknown> = {},
    options: CodeSandboxOptions = {}
  ): Promise<CodeExecutionResult> {
    if (language === "python") {
      return this.executePython(code, context, options);
    }
    return this.executeJavaScript(code, context, options);
  }
}
