import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./client", () => {
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
  };
});

import apiClient from "./client";
import { getAuditLogs, listCustomerBills } from "./adminApi";

describe("adminApi parameter mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps audit filters to backend query parameter names", async () => {
    apiClient.get.mockResolvedValueOnce({ data: { items: [], total: 0, limit: 10, offset: 0 } });

    await getAuditLogs({
      limit: 10,
      offset: 5,
      action: "MONTH_UNLOCKED",
      entityType: "MONTHLY_BILL",
      q: "correction",
      actorUserId: 7,
      startDate: "2026-03-01",
      endDate: "2026-03-31",
    });

    expect(apiClient.get).toHaveBeenCalledWith("/admin/audit-logs", {
      params: {
        limit: 10,
        offset: 5,
        action: "MONTH_UNLOCKED",
        entity_type: "MONTHLY_BILL",
        q: "correction",
        actor_user_id: 7,
        start_date: "2026-03-01",
        end_date: "2026-03-31",
      },
    });
  });

  it("maps billing list filter flags only_locked and only_unpaid", async () => {
    apiClient.get.mockResolvedValueOnce({ data: [] });

    await listCustomerBills(42, { onlyLocked: true, onlyUnpaid: true });

    expect(apiClient.get).toHaveBeenCalledWith("/admin/bills/customer/42", {
      params: {
        only_locked: true,
        only_unpaid: true,
      },
    });
  });
});
