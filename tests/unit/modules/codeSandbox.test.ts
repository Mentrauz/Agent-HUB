import { describe, it, expect } from "vitest";
import { CodeSandbox } from "@/modules/execution/sandbox/CodeSandbox";

describe("Phase 3: Sandboxed Code Execution Node Tests", () => {
  describe("JavaScript Execution", () => {
    it("executes valid JavaScript and returns structured output", async () => {
      const code = `
        const base = input.amount || 100;
        const tax = base * 0.15;
        console.log("Calculated tax:", tax);
        return { total: base + tax, taxRate: "15%" };
      `;

      const result = await CodeSandbox.executeJavaScript(code, {
        input: { amount: 200 },
      });

      expect(result.ok).toBe(true);
      expect(result.result).toEqual({ total: 230, taxRate: "15%" });
      expect(result.stdout).toContain("Calculated tax: 30");
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("isolates execution from sensitive host APIs", async () => {
      const code = `
        return typeof process !== 'undefined' ? "exposed" : "safe";
      `;

      const result = await CodeSandbox.executeJavaScript(code);
      expect(result.ok).toBe(true);
      expect(result.result).toBe("safe");
    });

    it("handles syntax errors gracefully", async () => {
      const code = `const a = ;`;
      const result = await CodeSandbox.executeJavaScript(code);
      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("Python Execution", () => {
    it("executes Python data transformations and math builtins", async () => {
      const code = `
        items = input['items']
        total_sum = sum(items)
        count = len(items)
        print("Processed", count, "items")
        return {"total": total_sum, "count": count, "average": total_sum / count}
      `;

      const result = await CodeSandbox.executePython(code, {
        input: { items: [10, 20, 30, 40] },
      });

      expect(result.ok).toBe(true);
      expect(result.result).toEqual({ total: 100, count: 4, average: 25 });
      expect(result.stdout).toContain("Processed 4 items");
    });
  });
});
