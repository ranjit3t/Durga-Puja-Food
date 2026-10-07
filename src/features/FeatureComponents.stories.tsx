import React from "react";
import { ActivityLogFilterBar } from "./activity/components/ActivityLogFilterBar";
import { ActivityLogItem } from "./activity/components/ActivityLogItem";
import { QuickCheckoutHeader } from "./checkout/components/QuickCheckoutHeader";
import { QuickCheckoutItemCard } from "./checkout/components/QuickCheckoutItemCard";
import { SubscriptionBasicInfoSection } from "./subscriptions/components/SubscriptionBasicInfoSection";
import { SubscriptionPaymentSection } from "./subscriptions/components/SubscriptionPaymentSection";
import { ActivityAction, ActivityModule, CheckoutSource, FreeMealCheckoutSource, PaymentMode } from "../domain";
import { primaryTheme } from "../theme/primary";
import { createStyles } from "../styles";
import { STORY_FIXTURES } from "../../.storybook/storyMocks";

const noop = () => undefined;
const styles = createStyles(primaryTheme, 375, 812);
const scale = (value: number) => value;
const subscription = STORY_FIXTURES.subscription as any;

function FeatureBasicInfoExample() {
  return (
    <SubscriptionBasicInfoSection
      block="A"
      setBlock={noop}
      blockOptions={["A", "B", "C"]}
      flat="101"
      setFlat={noop}
      phone="9876543210"
      setPhone={noop}
      peopleCount={1}
      setPeopleCount={noop}
      kidsCount={0}
      setKidsCount={noop}
      guestsCount={0}
      setGuestsCount={noop}
      kidsEnabled={false}
      guestsEnabled={false}
      mobileEnabled
      isAdmin
      canEdit
      lockIdentity={false}
      hasAnyMealTaken={false}
      minPeople={1}
      minKids={0}
      minGuests={0}
      theme={primaryTheme}
      styles={styles}
      s={scale}
    />
  );
}

function FeaturePaymentExample() {
  return (
    <SubscriptionPaymentSection
      payments={[{ amount: "80", mode: PaymentMode.CASH }]}
      totalAmount={80}
      updatePayment={noop}
      removePayment={noop}
      addPayment={noop}
      isAdmin
      canEdit
      enabledMethods={[PaymentMode.CASH, PaymentMode.UPI]}
      scannerTargetIdx={null}
      handleScanTransactionId={noop}
      sanitizeAmountText={(text) => text}
      theme={primaryTheme}
      styles={styles}
      s={scale}
    />
  );
}

export default { title: "UI/Features", parameters: { controls: { disable: true } } };

export const ActivityLogFilterBarStory = {
  name: "ActivityLogFilterBar",
  render: () => <ActivityLogFilterBar
    searchText=""
    setSearchText={noop}
    isAscending
    setIsAscending={noop}
    showFilters
    setShowFilters={noop}
    errorsOnly={false}
    setErrorsOnly={noop}
    selectedUser="All users"
    setSelectedUser={noop}
    userOptions={["All users", "admin"]}
    selectedDate="All dates"
    setSelectedDate={noop}
    dateOptions={["All dates"]}
    selectedModule="All modules"
    setSelectedModule={noop}
    moduleOptions={["All modules"]}
    selectedTarget="All targets"
    setSelectedTarget={noop}
    targetOptions={["All targets"]}
    handleExport={noop}
    handleSummarizeLogs={noop}
    filteredLogsCount={1}
    theme={primaryTheme}
    styles={styles}
    s={scale}
  />,
};

export const ActivityLogItemStory = {
  name: "ActivityLogItem",
  render: () => <ActivityLogItem
    item={{
      id: "sample-log",
      timestamp: Date.now(),
      userName: "Preview Administrator",
      module: ActivityModule.SUBSCRIPTION,
      action: ActivityAction.CREATE,
      targetId: subscription.id,
      description: "Registered pass for Block A - Flat 101",
    }}
    index={0}
    theme={primaryTheme}
    styles={styles}
    s={scale}
    subscriptions={[subscription]}
    onNavigateToDetails={noop}
    expanded={false}
    onToggleStack={noop}
  />,
};

export const ActivityLogItemCheckoutStory = {
  name: "ActivityLogItem/CheckoutFromScanner",
  render: () => <ActivityLogItem
    item={{
      id: "checkout-log",
      timestamp: Date.now(),
      userName: "Preview Administrator",
      userRole: "admin",
      module: ActivityModule.SCANNER,
      action: ActivityAction.UPDATE,
      targetId: subscription.id,
      description: `Checked in pass {id} via ${CheckoutSource.SCANNER}`,
    }}
    index={1}
    theme={primaryTheme}
    styles={styles}
    s={scale}
    subscriptions={[subscription]}
    onNavigateToDetails={noop}
    expanded={false}
    onToggleStack={noop}
  />,
};

export const ActivityLogItemFreeMealStory = {
  name: "ActivityLogItem/FreeMealCheckout",
  render: () => <ActivityLogItem
    item={{
      id: "free-meal-log",
      timestamp: Date.now(),
      userName: "Preview Administrator",
      module: ActivityModule.FREE_MEAL,
      action: ActivityAction.UPDATE,
      description: `Served 3 plates via ${FreeMealCheckoutSource.FREE_MEAL_MODAL}`,
    }}
    index={2}
    theme={primaryTheme}
    styles={styles}
    s={scale}
    subscriptions={[]}
    onNavigateToDetails={noop}
    expanded={false}
    onToggleStack={noop}
  />,
};

export const ActivityLogItemErrorStackStory = {
  name: "ActivityLogItem/ErrorWithStackTrace",
  render: () => <ActivityLogItem
    item={{
      id: "error-log",
      timestamp: Date.now(),
      userName: "Preview Administrator",
      module: ActivityModule.MENU,
      action: ActivityAction.ERROR,
      description: "Unable to update lunch menu",
      stack: "Error: write failed\\n  at updateMealMenu (repository.ts:120)\\n  at MenuEditorScreen.tsx:84",
    }}
    index={0}
    theme={primaryTheme}
    styles={styles}
    s={scale}
    subscriptions={[]}
    onNavigateToDetails={noop}
    expanded
    onToggleStack={noop}
  />,
};

export const QuickCheckoutHeaderStory = {
  name: "QuickCheckoutHeader",
  render: () => <QuickCheckoutHeader subscription={subscription} currentMealLabel="Lunch" onClose={noop} theme={primaryTheme} s={scale} />,
};

export const QuickCheckoutItemCardStory = {
  name: "QuickCheckoutItemCard",
  render: () => <QuickCheckoutItemCard
    label="Veg dine-in"
    plannedCount={12}
    servedCount={8}
    remCount={4}
    value={1}
    onChange={noop}
    max={4}
    theme={primaryTheme}
    s={scale}
  />,
};

export const SubscriptionBasicInfoSectionStory = { name: "SubscriptionBasicInfoSection", render: () => <FeatureBasicInfoExample /> };
export const SubscriptionPaymentSectionStory = { name: "SubscriptionPaymentSection", render: () => <FeaturePaymentExample /> };