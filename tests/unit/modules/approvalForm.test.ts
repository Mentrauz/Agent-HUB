import { describe, it, expect, vi } from "vitest";
import { ApprovalEngine } from "@/modules/approval/approval-engine/approvalEngine";
import { IApprovalRepository } from "@/repositories/interfaces/IApprovalRepository";
import { IApprovalHistoryRepository } from "@/repositories/interfaces/IApprovalHistoryRepository";
import { IExecutionRepository } from "@/repositories/interfaces/IExecutionRepository";
import { ApprovalRequestDTO } from "@/types/approval";

describe("Phase 2: Interactive Form HITL Approval Tests", () => {
  it("persists and returns submitted formData when an interactive approval request is approved", async () => {
    let storedRequest: ApprovalRequestDTO = {
      id: "app_123",
      executionId: "exec_456",
      userId: "user_789",
      skillName: "Employee Onboarding",
      plannerReason: "HR Manager signoff with department allocation",
      toolName: "Manager Signoff",
      action: "approve_onboarding",
      inputPayload: {
        nodeId: "approval_node_1",
        formFields: [
          { name: "department", label: "Assigned Department", type: "select", options: ["Engineering", "Product", "Design"] },
          { name: "laptopProvisioned", label: "Laptop Model", type: "text" },
        ],
      },
      status: "PENDING",
      idempotencyKey: "graph-exec_456-approval_node_1",
      requestedAt: new Date(),
    };

    const mockApprovalRepo: IApprovalRepository = {
      findById: vi.fn().mockImplementation(async (id: string) => (storedRequest.id === id ? storedRequest : null)),
      findByExecutionId: vi.fn().mockResolvedValue([storedRequest]),
      findByUserId: vi.fn().mockResolvedValue([storedRequest]),
      findPendingByUserId: vi.fn().mockResolvedValue([storedRequest]),
      create: vi.fn(),
      upsertByIdempotencyKey: vi.fn(),
      findByIdempotencyKey: vi.fn().mockImplementation(async () => storedRequest),
      expireByIdempotencyKey: vi.fn(),
      expireStaleForUser: vi.fn().mockResolvedValue(0),
      respond: vi.fn().mockImplementation(async (input) => {
        storedRequest = {
          ...storedRequest,
          status: input.approved ? "APPROVED" : "REJECTED",
          inputPayload: {
            ...storedRequest.inputPayload,
            formResponse: input.formData,
          },
          respondedAt: new Date(),
        };
        return storedRequest;
      }),
    };

    const mockHistoryRepo: IApprovalHistoryRepository = {
      log: vi.fn().mockResolvedValue({ id: "hist_1" }),
      findByApprovalId: vi.fn().mockResolvedValue([]),
      findByExecutionId: vi.fn().mockResolvedValue([]),
    };

    const mockExecutionRepo = {} as IExecutionRepository;

    const engine = new ApprovalEngine(mockApprovalRepo, mockHistoryRepo, mockExecutionRepo);

    const formData = {
      department: "Engineering",
      laptopProvisioned: "MacBook Pro M3 Max",
    };

    const result = await engine.approve(
      "app_123",
      "user_789",
      "graph-exec_456-approval_node_1",
      formData
    );

    expect(result.status).toBe("APPROVED");
    expect(mockApprovalRepo.respond).toHaveBeenCalledWith({
      approvalId: "app_123",
      userId: "user_789",
      approved: true,
      idempotencyKey: "graph-exec_456-approval_node_1",
      formData: {
        department: "Engineering",
        laptopProvisioned: "MacBook Pro M3 Max",
      },
    });

    const formResponse = (result.inputPayload as { formResponse?: Record<string, unknown> }).formResponse;
    expect(formResponse).toEqual({
      department: "Engineering",
      laptopProvisioned: "MacBook Pro M3 Max",
    });
  });
});
