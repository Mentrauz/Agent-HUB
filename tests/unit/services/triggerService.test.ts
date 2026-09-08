import { describe, it, expect } from "vitest";
import { TriggerService } from "@/services/TriggerService";
import crypto from "crypto";

describe("TriggerService Unit Tests", () => {
  it("generates a random secure webhook token starting with wh_", () => {
    const token = TriggerService.generateToken();
    expect(token).toMatch(/^wh_[a-f0-9]{48}$/);
  });

  describe("verifySignature", () => {
    const secret = "test_webhook_secret_key_123";
    const payload = JSON.stringify({ event: "order_created", amount: 99.5 });

    it("verifies valid HMAC SHA-256 signatures", () => {
      const hmac = crypto.createHmac("sha256", secret).update(payload).digest("hex");
      const isValid = TriggerService.verifySignature(payload, hmac, secret);
      expect(isValid).toBe(true);
    });

    it("verifies signatures with sha256= prefix", () => {
      const hmac = "sha256=" + crypto.createHmac("sha256", secret).update(payload).digest("hex");
      const isValid = TriggerService.verifySignature(payload, hmac, secret);
      expect(isValid).toBe(true);
    });

    it("rejects tampered payloads or wrong signatures", () => {
      const hmac = crypto.createHmac("sha256", secret).update(payload).digest("hex");
      const isValid = TriggerService.verifySignature(payload + "tampered", hmac, secret);
      expect(isValid).toBe(false);
    });

    it("returns true when no secret is configured", () => {
      const isValid = TriggerService.verifySignature(payload, undefined, "");
      expect(isValid).toBe(true);
    });
  });

  describe("mapPayloadToInput", () => {
    it("maps mapped fields correctly from body, headers, and query", () => {
      const payload = {
        body: {
          user: { name: "Soumya Singh", email: "Soumya@example.com" },
          item: { id: "item_99" },
        },
        headers: {
          "x-event-type": "USER_SIGNUP",
          "content-type": "application/json",
        },
        query: {
          source: "campaign_1",
        },
      };

      const mappingRules = {
        customerName: "{{body.user.name}}",
        customerEmail: "{{body.user.email}}",
        eventType: "{{headers.x-event-type}}",
        campaign: "{{query.source}}",
        staticTag: "production",
      };

      const mapped = TriggerService.mapPayloadToInput(payload, mappingRules);

      expect(mapped).toEqual({
        customerName: "Soumya",
        customerEmail: "Soumya@example.com",
        eventType: "USER_SIGNUP",
        campaign: "campaign_1",
        staticTag: "production",
      });
    });

    it("provides clean default mapping when no mapping rules are defined", () => {
      const payload = {
        body: { message: "Hello AI Agent" },
        headers: { "x-api-key": "secret" },
        query: { debug: "true" },
      };

      const mapped = TriggerService.mapPayloadToInput(payload, {});

      expect(mapped.message).toBe("Hello AI Agent");
      expect(mapped._webhook).toBeDefined();
      expect((mapped._webhook as { query: Record<string, string> }).query.debug).toBe("true");
    });
  });
});
