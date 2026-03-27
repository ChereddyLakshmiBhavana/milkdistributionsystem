import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../api/adminApi", () => ({
  generateBill: vi.fn(),
  getBillPdfUrl: vi.fn(() => "#"),
  getCustomers: vi.fn(),
  listCustomerBills: vi.fn(),
  lockBillMonth: vi.fn(),
  recordPayment: vi.fn(),
  unlockBillMonth: vi.fn(),
}));

import {
  generateBill,
  getCustomers,
  listCustomerBills,
} from "../../api/adminApi";
import AdminBillingPage from "./AdminBillingPage";

function renderPage() {
  render(<AdminBillingPage lang="en" />);
}

describe("AdminBillingPage interactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("asks confirmation before generating bill for a future month", async () => {
    getCustomers.mockResolvedValueOnce([
      { id: 1, name: "Customer One", phone: "9000000001", status: "APPROVED" },
    ]);
    listCustomerBills.mockResolvedValue([]);
    window.confirm.mockReturnValueOnce(false);

    renderPage();

    const selects = await screen.findAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "1" } });

    const yearInput = screen.getByPlaceholderText("Year");
    fireEvent.change(yearInput, { target: { value: String(new Date().getFullYear() + 1) } });

    fireEvent.click(screen.getByRole("button", { name: "Generate Monthly Bill" }));

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledTimes(1);
    });
    expect(generateBill).not.toHaveBeenCalled();
  });

  it("supports removable filter chip for Only Locked", async () => {
    getCustomers.mockResolvedValueOnce([
      { id: 1, name: "Customer One", phone: "9000000001", status: "APPROVED" },
    ]);
    listCustomerBills.mockResolvedValue([
      {
        id: 100,
        month_start: "2026-03-01",
        total_amount: "86.00",
        previous_due: "0.00",
        payable_amount: "86.00",
        paid_amount: "0.00",
        unpaid_amount: "86.00",
        status: "UNPAID",
        is_locked: true,
      },
    ]);

    renderPage();

    const selects = await screen.findAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "1" } });

    const clearBtn = screen.getByRole("button", { name: "Clear Filters" });
    expect(clearBtn).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Only Locked" }));

    const chipBtn = await screen.findByRole("button", { name: "Only Locked x" });
    expect(clearBtn).not.toBeDisabled();

    fireEvent.click(chipBtn);

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Only Locked x" })).not.toBeInTheDocument();
    });
  });

  it("resets sort to newest when sort chip is removed", async () => {
    getCustomers.mockResolvedValueOnce([
      { id: 1, name: "Customer One", phone: "9000000001", status: "APPROVED" },
    ]);
    listCustomerBills.mockResolvedValue([
      {
        id: 100,
        month_start: "2026-03-01",
        total_amount: "86.00",
        previous_due: "0.00",
        payable_amount: "86.00",
        paid_amount: "0.00",
        unpaid_amount: "86.00",
        status: "UNPAID",
        is_locked: false,
      },
    ]);

    renderPage();

    const selects = await screen.findAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "1" } });

    fireEvent.change(selects[1], { target: { value: "oldest" } });

    const sortChip = await screen.findByRole("button", { name: "Sort: Oldest First x" });
    fireEvent.click(sortChip);

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Sort: Oldest First x" })).not.toBeInTheDocument();
    });
    expect(screen.getByText("Sort: Newest First")).toBeInTheDocument();
  });
});
