import { hasPassesInTenantSeasonData } from "../utils/tenantPasses";

describe("hasPassesInTenantSeasonData", () => {
  it("finds passes in any current or historical season", () => {
    expect(
      hasPassesInTenantSeasonData(null, {
        current: { subscriptions: {} },
        historical: { subscriptions: { pass1: { flat: "1A" } } },
      }),
    ).toBe(true);
  });

  it("finds passes in the tenant's legacy root subscription collection", () => {
    expect(
      hasPassesInTenantSeasonData({ pass1: { flat: "1A" } }, {}),
    ).toBe(true);
  });

  it("returns false when the tenant has no pass records", () => {
    expect(
      hasPassesInTenantSeasonData(null, {
        current: { subscriptions: {} },
        historical: {},
      }),
    ).toBe(false);
  });
});
