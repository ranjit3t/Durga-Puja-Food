import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { CatererFinanceCategory } from "../domain";

type Listener = (snapshot: {
  exists: () => boolean;
  val: () => unknown;
  key: string | null;
}) => void;

const valueListeners = new Map<string, Listener>();
const childListeners = new Map<string, Listener>();

jest.doMock("../firebase", () => ({
  ensureFirebaseAuth: jest.fn(async () => ({ db: {} })),
  firebaseConfigured: true,
}));

jest.doMock("firebase/database", () => {
  const databaseValues = new Map<string, unknown>();
  const subscribe = (event: string, reference: { path: string }, callback: Listener) => {
    const key = `${event}:${reference.path}`;
    const listeners = event === "value" ? valueListeners : childListeners;
    listeners.set(key, callback);
    return () => listeners.delete(key);
  };

  return {
    equalTo: jest.fn(),
    get: jest.fn(async (reference: { path: string }) => {
      const value = databaseValues.get(reference.path);
      return {
        exists: () => value !== null && value !== undefined,
        val: () => value,
      };
    }),
    increment: jest.fn(),
    limitToLast: jest.fn(),
    onChildAdded: (reference: { path: string }, callback: Listener) => subscribe("added", reference, callback),
    onChildChanged: (reference: { path: string }, callback: Listener) => subscribe("changed", reference, callback),
    onChildRemoved: (reference: { path: string }, callback: Listener) => subscribe("removed", reference, callback),
    onDisconnect: jest.fn(),
    onValue: (reference: { path: string }, callback: Listener) => subscribe("value", reference, callback),
    orderByChild: jest.fn(),
    push: jest.fn(),
    query: jest.fn(),
    ref: (_database: unknown, path = "") => ({ path }),
    remove: jest.fn(),
    serverTimestamp: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
    databaseValues,
  };
});

const { createFirebaseRepository } = require("../repository") as typeof import("../repository");

function snapshot(value: unknown, key: string | null = null) {
  return {
    exists: () => value !== null && value !== undefined,
    val: () => value,
    key,
  };
}

afterEach(() => {
  valueListeners.clear();
  childListeners.clear();
  const database = require("firebase/database") as { databaseValues: Map<string, unknown> };
  database.databaseValues.clear();
});

describe("tenant realtime repository listeners", () => {
  it("streams added, updated, checked-in, and removed passes from the active tenant season", async () => {
    const repository = createFirebaseRepository();
    repository.setTenantId("tenant-a");
    const added = jest.fn();
    const changed = jest.fn();
    const removed = jest.fn();
    const unsubscribe = repository.onSubscriptionsDelta(
      added,
      changed,
      removed,
      ["Shashthi"],
      undefined,
      "DP2026",
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    const subscriptionsPath = "tenants/tenant-a/seasons_data/DP2026/subscriptions";
    expect([...childListeners.keys()]).toEqual([
      `added:${subscriptionsPath}`,
      `changed:${subscriptionsPath}`,
      `removed:${subscriptionsPath}`,
    ]);

    const initialPass = {
      id: "flat-101",
      block: "1",
      flat: "101",
      passcode: "1234",
      peopleCount: 1,
      mealSlots: {},
      takenByPerson: {},
    };
    childListeners.get(`added:${subscriptionsPath}`)?.(snapshot(initialPass, "flat-101"));
    expect(added).toHaveBeenCalledWith(expect.objectContaining({ id: "flat-101", passcode: "1234" }));

    const checkedInPass = {
      ...initialPass,
      takenByPerson: { Shashthi: [{ lunch: true, lunchParcel: true }] },
    };
    childListeners.get(`changed:${subscriptionsPath}`)?.(snapshot(checkedInPass, "flat-101"));
    expect(changed).toHaveBeenCalledWith(expect.objectContaining({
      id: "flat-101",
      takenByPerson: expect.objectContaining({
        Shashthi: [expect.objectContaining({ lunch: true, lunchParcel: true })],
      }),
    }));

    childListeners.get(`removed:${subscriptionsPath}`)?.(snapshot(null, "flat-101"));
    expect(removed).toHaveBeenCalledWith("flat-101");

    unsubscribe();
    expect(childListeners.size).toBe(0);
  });

  it("forwards realtime app-version and user-configuration changes", async () => {
    const repository = createFirebaseRepository();
    const versionChanged = jest.fn();
    const userConfigChanged = jest.fn();
    const unsubscribeVersion = repository.onAppVersionChange(versionChanged);
    const unsubscribeUserConfig = repository.onAuthConfigChange(userConfigChanged);
    await new Promise((resolve) => setTimeout(resolve, 0));

    valueListeners.get("value:appVersion")?.(snapshot("2.0.0"));
    expect(versionChanged).toHaveBeenCalledWith(expect.objectContaining({ version: "2.0.0" }));

    const authConfig = { users: [{ username: "operator", disabled: true }] };
    valueListeners.get("value:auth_config")?.(snapshot(authConfig));
    expect(userConfigChanged).toHaveBeenCalledWith(authConfig);

    unsubscribeVersion();
    unsubscribeUserConfig();
    expect(valueListeners.size).toBe(0);
  });

  it("listens only to the shared root notes collection", async () => {
    const repository = createFirebaseRepository();
    const added = jest.fn();
    const changed = jest.fn();
    const removed = jest.fn();
    const unsubscribe = repository.onNotesDelta(added, changed, removed, "tenant-a", false);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect([...childListeners.keys()].sort()).toEqual([
      "added:notes",
      "changed:notes",
      "removed:notes",
    ]);

    childListeners.get("added:notes")?.(snapshot({ subject: "Root note", content: "Shared" }, "note-1"));
    childListeners.get("changed:notes")?.(snapshot({ subject: "Updated note", content: "Updated" }, "note-1"));
    childListeners.get("removed:notes")?.(snapshot(null, "note-1"));
    expect(added).toHaveBeenCalledWith(expect.objectContaining({ id: "note-1", subject: "Root note" }));
    expect(changed).toHaveBeenCalledWith(expect.objectContaining({ id: "note-1", subject: "Updated note" }));
    expect(removed).toHaveBeenCalledWith("note-1");

    unsubscribe();
    expect(childListeners.size).toBe(0);
  });

  it("rebinds config listeners when the active season changes", async () => {
    const repository = createFirebaseRepository();
    const database = require("firebase/database") as {
      databaseValues: Map<string, unknown>;
    };
    database.databaseValues.set("tenants/tenant-a/config", { activeSeasonCode: "DP2026" });
    database.databaseValues.set("tenants/tenant-a/seasons_data/DP2026/config", {
      seasonCode: "DP2026",
      seasonName: "Festival 2026",
      days: [],
    });

    const configChanged = jest.fn();
    const unsubscribe = repository.onConfigChange(configChanged, "tenant-a");
    await new Promise((resolve) => setTimeout(resolve, 0));
    valueListeners.get("value:tenants/tenant-a/config")?.(
      snapshot({ activeSeasonCode: "DP2026" }),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    const oldSeasonPath = "tenants/tenant-a/seasons_data/DP2026/config";
    expect(valueListeners.has(`value:${oldSeasonPath}`)).toBe(true);
    expect(configChanged).toHaveBeenLastCalledWith(expect.objectContaining({
      activeSeasonCode: "DP2026",
      seasonName: "Festival 2026",
    }));

    database.databaseValues.set("tenants/tenant-a/config", { activeSeasonCode: "DP2027" });
    database.databaseValues.set("tenants/tenant-a/seasons_data/DP2027/config", {
      seasonCode: "DP2027",
      seasonName: "Festival 2027",
      days: [],
    });
    valueListeners.get("value:tenants/tenant-a/config")?.(
      snapshot({ activeSeasonCode: "DP2027" }),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    const newSeasonPath = "tenants/tenant-a/seasons_data/DP2027/config";
    expect(valueListeners.has(`value:${oldSeasonPath}`)).toBe(false);
    expect(valueListeners.has(`value:${newSeasonPath}`)).toBe(true);
    expect(configChanged).toHaveBeenLastCalledWith(expect.objectContaining({
      activeSeasonCode: "DP2027",
      seasonName: "Festival 2027",
    }));

    unsubscribe();
    expect(valueListeners.size).toBe(0);
  });

  it("uses the explicit tenant and active season for package and caterer data", async () => {
    const repository = createFirebaseRepository();
    const database = require("firebase/database") as {
      databaseValues: Map<string, unknown>;
      set: { mock: { calls: unknown[][] }; mockClear: () => void };
      remove: { mock: { calls: unknown[][] }; mockClear: () => void };
    };
    repository.setTenantId("wrong-tenant");

    const packagePath = "tenants/tenant-a/seasons_data/DP2026/food_packages";
    const catererPath = "tenants/tenant-a/seasons_data/DP2026/caterer_finance";
    database.databaseValues.set(packagePath, {
      "pkg-1": { id: "pkg-1", name: "Lunch", timestamp: 1 },
    });
    database.databaseValues.set(catererPath, {
      "tx-1": { id: "tx-1", type: "expense", amount: 25, date: 1 },
    });

    await expect(repository.getFoodPackages("tenant-a", "DP2026")).resolves.toEqual([
      expect.objectContaining({ id: "pkg-1", name: "Lunch" }),
    ]);
    await expect(repository.getCatererTransactions("tenant-a", "DP2026")).resolves.toEqual([
      expect.objectContaining({ id: "tx-1", amount: 25 }),
    ]);

    database.set.mockClear();
    database.remove.mockClear();
    await repository.upsertFoodPackage({
      id: "pkg-2",
      name: "Dinner",
      description: "",
      applicability: "member",
      enabled: true,
      timestamp: 2,
    }, "tenant-a", "DP2026");
    await repository.upsertCatererTransaction({
      id: "tx-2",
      type: "expense",
      category: CatererFinanceCategory.OTHER_INCOME,
      amount: 50,
      description: "",
      date: 2,
      addedBy: "operator",
    }, "tenant-a", "DP2026");
    await repository.removeFoodPackage("pkg-1", "tenant-a", "DP2026");
    await repository.removeCatererTransaction("tx-1", "tenant-a", "DP2026");

    const writtenPaths = database.set.mock.calls.map(([reference]) => (reference as { path: string }).path);
    const removedPaths = database.remove.mock.calls.map(([reference]) => (reference as { path: string }).path);
    expect(writtenPaths).toEqual([`${packagePath}/pkg-2`, `${catererPath}/tx-2`]);
    expect(removedPaths).toEqual([`${packagePath}/pkg-1`, `${catererPath}/tx-1`]);

    const packageAdded = jest.fn();
    const packageChanged = jest.fn();
    const packageRemoved = jest.fn();
    const catererAdded = jest.fn();
    const catererChanged = jest.fn();
    const catererRemoved = jest.fn();
    const unsubscribePackages = repository.onFoodPackagesDelta(
      packageAdded,
      packageChanged,
      packageRemoved,
      "tenant-a",
      "DP2026",
    );
    const unsubscribeCaterer = repository.onCatererTransactionsDelta(
      catererAdded,
      catererChanged,
      catererRemoved,
      "tenant-a",
      "DP2026",
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(childListeners.has(`added:${packagePath}`)).toBe(true);
    expect(childListeners.has(`added:${catererPath}`)).toBe(true);

    childListeners.get(`added:${packagePath}`)?.(snapshot({ name: "Snack", timestamp: 3 }, "pkg-3"));
    childListeners.get(`changed:${packagePath}`)?.(snapshot({ name: "Dinner", timestamp: 4 }, "pkg-2"));
    childListeners.get(`removed:${packagePath}`)?.(snapshot(null, "pkg-1"));
    expect(packageAdded).toHaveBeenCalledWith(expect.objectContaining({ id: "pkg-3", name: "Snack" }));
    expect(packageChanged).toHaveBeenCalledWith(expect.objectContaining({ id: "pkg-2", name: "Dinner" }));
    expect(packageRemoved).toHaveBeenCalledWith("pkg-1");

    childListeners.get(`added:${catererPath}`)?.(snapshot({ amount: 75, date: 3 }, "tx-3"));
    childListeners.get(`changed:${catererPath}`)?.(snapshot({ amount: 100, date: 4 }, "tx-2"));
    childListeners.get(`removed:${catererPath}`)?.(snapshot(null, "tx-1"));
    expect(catererAdded).toHaveBeenCalledWith(expect.objectContaining({ id: "tx-3", amount: 75 }));
    expect(catererChanged).toHaveBeenCalledWith(expect.objectContaining({ id: "tx-2", amount: 100 }));
    expect(catererRemoved).toHaveBeenCalledWith("tx-1");

    unsubscribePackages();
    unsubscribeCaterer();
    expect(childListeners.size).toBe(0);
  });
});
