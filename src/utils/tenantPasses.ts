export function hasPassesInTenantSeasonData(
  rootSubscriptions: unknown,
  seasonsData: Record<string, { subscriptions?: unknown }> | null | undefined,
): boolean {
  const hasRecords = (value: unknown) =>
    value !== null &&
    typeof value === "object" &&
    Object.keys(value).length > 0;

  return (
    hasRecords(rootSubscriptions) ||
    Object.values(seasonsData || {}).some((season) => hasRecords(season?.subscriptions))
  );
}
