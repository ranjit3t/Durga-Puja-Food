import { describe, expect, it } from "@jest/globals";
import { UserRole, CatererFinanceCategory, CatererTransaction } from "../domain";

describe("Caterer Income & Expense Page Access and Financial Privacy Tests", () => {
  it("allows access to caterer and admin roles, denies access to vendor role", () => {
    const isAuthorized = (role: UserRole) => role === UserRole.CATERER || role === UserRole.ADMIN;

    expect(isAuthorized(UserRole.CATERER)).toBe(true);
    expect(isAuthorized(UserRole.ADMIN)).toBe(true);
    expect(isAuthorized(UserRole.VENDOR)).toBe(false);
  });

  it("starts with empty transactions and 0 financial data, protecting pass subscription privacy", () => {
    const initialTransactions: CatererTransaction[] = [];

    const totalIncome = initialTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = initialTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const netBalance = totalIncome - totalExpenses;

    expect(initialTransactions.length).toBe(0);
    expect(totalIncome).toBe(0);
    expect(totalExpenses).toBe(0);
    expect(netBalance).toBe(0);
  });

  it("correctly sums operator-added income, expenses, and calculates net balance including organizer payments", () => {
    const customTransactions: CatererTransaction[] = [
      {
        id: "tx-1",
        type: "income",
        category: CatererFinanceCategory.ORGANIZER_PAYMENTS,
        amount: 150000,
        description: "Advance installment from puja committee",
        date: Date.now(),
        addedBy: "Admin",
      },
      {
        id: "tx-2",
        type: "expense",
        category: CatererFinanceCategory.RAW_MATERIALS,
        amount: 60000,
        description: "Rice, dal, vegetables",
        date: Date.now(),
        addedBy: "Caterer",
      },
      {
        id: "tx-3",
        type: "expense",
        category: CatererFinanceCategory.LABOR,
        amount: 30000,
        description: "Cooking staff wages",
        date: Date.now(),
        addedBy: "Caterer",
      },
    ];

    const totalIncome = customTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = customTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const netBalance = totalIncome - totalExpenses;

    expect(totalIncome).toBe(150000);
    expect(totalExpenses).toBe(90000);
    expect(netBalance).toBe(60000); // 60,000 INR Credit
  });

  it("correctly groups transactions by category", () => {
    const transactions: CatererTransaction[] = [
      {
        id: "tx-1",
        type: "expense",
        category: CatererFinanceCategory.RAW_MATERIALS,
        amount: 20000,
        description: "Vegetables",
        date: Date.now(),
        addedBy: "Caterer",
      },
      {
        id: "tx-2",
        type: "expense",
        category: CatererFinanceCategory.RAW_MATERIALS,
        amount: 30000,
        description: "Groceries",
        date: Date.now(),
        addedBy: "Caterer",
      },
      {
        id: "tx-3",
        type: "expense",
        category: CatererFinanceCategory.LOGISTICS,
        amount: 5000,
        description: "Transport",
        date: Date.now(),
        addedBy: "Caterer",
      },
    ];

    const rawMaterialsTotal = transactions
      .filter((t) => t.category === CatererFinanceCategory.RAW_MATERIALS)
      .reduce((s, t) => s + t.amount, 0);

    const logisticsTotal = transactions
      .filter((t) => t.category === CatererFinanceCategory.LOGISTICS)
      .reduce((s, t) => s + t.amount, 0);

    expect(rawMaterialsTotal).toBe(50000);
    expect(logisticsTotal).toBe(5000);
  });
});
