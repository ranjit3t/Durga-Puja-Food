import React from "react";
import { Text } from "react-native";
import { ActionLabel } from "./ActionLabel";
import { BackButton } from "./BackButton";
import { CustomAlert } from "./CustomAlert";
import { Dropdown } from "./Dropdown";
import { EditableMetric } from "./EditableMetric";
import { ErrorBoundary } from "./ErrorBoundary";
import { HomeButton } from "./HomeButton";
import { LogoutButton } from "./LogoutButton";
import { Metric } from "./Metric";
import { PaymentScannerModal } from "./PaymentScannerModal";
import { QuickCheckoutModal } from "./QuickCheckoutModal";
import { QuickFreeMealModal } from "./QuickFreeMealModal";
import { ThemeToggleButton } from "./ThemeToggleButton";
import { UserGreeting } from "./UserGreeting";
import { ChatWidget } from "../chat/ChatWidget";
import { DietaryOption, MealType } from "../../domain";
import { useDatabase } from "../../context/DatabaseContext";
import { STORY_FIXTURES, StoryMockProvider } from "../../../.storybook/storyMocks";

const noop = () => undefined;

function QuickCheckoutExample() {
  const { subscriptions } = useDatabase();
  return (
    <QuickCheckoutModal
      visible
      subscription={subscriptions[0]}
      currentMealInfo={{ dayId: "Shashthi", mealType: MealType.LUNCH, dayLabel: "Shashthi", mealLabel: "Lunch" }}
      onClose={noop}
      onSuccess={noop}
    />
  );
}

const multiCategoryDayConfig = (STORY_FIXTURES.dayConfig as any[]).map((day) =>
  day.id === "Shashthi"
    ? { ...day, lunch: { ...day.lunch, kidsParcel: true, guestsParcel: true } }
    : day,
);

function createCheckoutPass(
  id: string,
  adults: Array<{ choice: DietaryOption; parcel?: boolean }>,
  kids: Array<{ choice: DietaryOption; parcel?: boolean }> = [],
  guests: Array<{ choice: DietaryOption; parcel?: boolean }> = [],
  servedIndexes: number[] = [],
) {
  const people = [...adults, ...kids, ...guests];

  return {
    ...STORY_FIXTURES.subscription,
    id,
    peopleCount: adults.length,
    kidsCount: kids.length,
    guestsCount: guests.length,
    mealSlots: {
      Shashthi: people.map(({ choice, parcel }) => ({
        breakfast: DietaryOption.NONE,
        lunch: choice,
        dinner: DietaryOption.NONE,
        breakfastParcel: false,
        lunchParcel: !!parcel,
        dinnerParcel: false,
      })),
    },
    takenByPerson: {
      Shashthi: people.map((_, index) => ({
        breakfast: false,
        lunch: servedIndexes.includes(index),
        dinner: false,
        lunchParcel: false,
      })),
    },
  };
}

function QuickCheckoutPass({ subscription }: { subscription: any }) {
  return (
    <QuickCheckoutModal
      visible
      subscription={subscription}
      currentMealInfo={{ dayId: "Shashthi", mealType: MealType.LUNCH, dayLabel: "Shashthi", mealLabel: "Lunch" }}
      onClose={noop}
      onSuccess={noop}
    />
  );
}

function QuickFreeMealExample() {
  return (
    <QuickFreeMealModal
      visible
      currentMealInfo={{ dayId: "Shashthi", mealType: MealType.LUNCH, dayLabel: "Shashthi", mealLabel: "Lunch" }}
      onClose={noop}
    />
  );
}

const previewVendor = {
  username: "vendor",
  displayName: "Kitchen Vendor",
  role: "Vendor",
  online: true,
  lastSeen: Date.now(),
  unreadCount: 3,
  lastMessage: { text: "Lunch counter is ready" },
};

function ChatWidgetScenario({ chat }: { chat: Record<string, any> }) {
  return (
    <StoryMockProvider chat={chat}>
      <ChatWidget />
    </StoryMockProvider>
  );
}

export default {
  title: "UI/Common",
  parameters: { controls: { disable: true } },
};

export const ActionLabelStory = { name: "ActionLabel", render: () => <ActionLabel icon="restaurant-outline" label="Lunch service" /> };
export const BackButtonStory = { name: "BackButton", render: () => <BackButton onPress={noop} /> };
export const CustomAlertStory = {
  name: "CustomAlert",
  render: () => <CustomAlert visible title="Saved" message="The menu was updated." onClose={noop} />,
};
export const CustomAlertDestructiveStory = {
  name: "CustomAlert/DestructiveAction",
  render: () => <CustomAlert
    visible
    title="Delete food package?"
    message="This action cannot be undone."
    buttons={[{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive" }]}
    onClose={noop}
  />,
};
export const DropdownStory = {
  name: "Dropdown",
  render: () => <Dropdown label="Meal" value="Lunch" options={["Breakfast", "Lunch", "Dinner"]} onChange={noop} />,
};
export const DropdownUnselectedStory = {
  name: "Dropdown/Unselected",
  render: () => <Dropdown label="Meal" value="" options={["Breakfast", "Lunch", "Dinner"]} onChange={noop} />,
};
export const DropdownDisabledStory = {
  name: "Dropdown/Disabled",
  render: () => <Dropdown label="Meal" value="Lunch" options={["Breakfast", "Lunch", "Dinner"]} onChange={noop} disabled />,
};
export const EditableMetricStory = {
  name: "EditableMetric",
  render: () => <EditableMetric icon="people-outline" label="Members" value={24} onSave={noop} />,
};
export const EditableMetricDisabledStory = {
  name: "EditableMetric/Disabled",
  render: () => <EditableMetric icon="people-outline" label="Members" value={24} onSave={noop} disabled />,
};
export const ErrorBoundaryStory = {
  name: "ErrorBoundary",
  render: () => <ErrorBoundary><Text>Component rendered successfully.</Text></ErrorBoundary>,
};
export const HomeButtonStory = { name: "HomeButton", render: () => <HomeButton onPress={noop} /> };
export const LogoutButtonStory = { name: "LogoutButton", render: () => <LogoutButton onLogout={noop} /> };
export const MetricStory = { name: "Metric", render: () => <Metric icon="restaurant-outline" label="Meals served" value={48} /> };
export const PaymentScannerModalStory = {
  name: "PaymentScannerModal",
  render: () => <PaymentScannerModal visible onClose={noop} onExtracted={noop} />,
};
export const QuickCheckoutModalStory = { name: "QuickCheckoutModal", render: () => <QuickCheckoutExample /> };
export const QuickCheckoutAdultsOnlyStory = {
  name: "QuickCheckoutModal/AdultsOnly",
  render: () => <QuickCheckoutPass subscription={STORY_FIXTURES.subscription} />,
  parameters: { storyMocks: { database: { kidsEnabled: false, guestsEnabled: false } } },
};
export const QuickCheckoutAdultsAndKidsStory = {
  name: "QuickCheckoutModal/AdultsAndKids",
  render: () => <QuickCheckoutPass subscription={createCheckoutPass(
    "adult-kid-pass",
    [{ choice: DietaryOption.VEG }, { choice: DietaryOption.NON_VEG }],
    [{ choice: DietaryOption.VEG, parcel: true }],
  )} />,
  parameters: { storyMocks: { database: { kidsEnabled: true, guestsEnabled: false, dayConfig: multiCategoryDayConfig } } },
};
export const QuickCheckoutAllCategoriesStory = {
  name: "QuickCheckoutModal/AdultsKidsGuests",
  render: () => <QuickCheckoutPass subscription={createCheckoutPass(
    "adult-kid-guest-pass",
    [{ choice: DietaryOption.VEG }, { choice: DietaryOption.NON_VEG, parcel: true }],
    [{ choice: DietaryOption.VEG, parcel: true }],
    [{ choice: DietaryOption.NON_VEG }],
  )} />,
  parameters: { storyMocks: { database: { kidsEnabled: true, guestsEnabled: true, dayConfig: multiCategoryDayConfig } } },
};
export const QuickCheckoutPartialServiceStory = {
  name: "QuickCheckoutModal/PartialServiceAndParcels",
  render: () => <QuickCheckoutPass subscription={createCheckoutPass(
    "partial-service-pass",
    [{ choice: DietaryOption.VEG }, { choice: DietaryOption.NON_VEG, parcel: true }],
    [{ choice: DietaryOption.VEG, parcel: true }],
    [{ choice: DietaryOption.NON_VEG }],
    [0],
  )} />,
  parameters: { storyMocks: { database: { kidsEnabled: true, guestsEnabled: true, dayConfig: multiCategoryDayConfig } } },
};
export const QuickFreeMealModalStory = { name: "QuickFreeMealModal", render: () => <QuickFreeMealExample /> };
export const ThemeToggleButtonStory = { name: "ThemeToggleButton", render: () => <ThemeToggleButton /> };
export const UserGreetingStory = { name: "UserGreeting", render: () => <UserGreeting /> };
export const ChatWidgetStory = { name: "ChatWidget", render: () => <ChatWidget /> };
export const ChatWindowUnreadStory = {
  name: "ChatWindow/MinimizedWithUnread",
  render: () => <ChatWidgetScenario chat={{ totalUnreadCount: 3 }} />,
};
export const ChatWindowInboxStory = {
  name: "ChatWindow/ExpandedInbox",
  render: () => <ChatWidgetScenario chat={{ isExpanded: true, availableUsers: [previewVendor] }} />,
};
export const ChatWindowConversationStory = {
  name: "ChatWindow/ActiveConversation",
  render: () => <ChatWidgetScenario chat={{
    isExpanded: true,
    activeRecipient: previewVendor,
    messages: [
      { id: "message-1", sender: "vendor", text: "Lunch counter is ready", timestamp: Date.now() - 120000, status: "read" },
      { id: "message-2", sender: "admin", text: "Thanks, opening now.", timestamp: Date.now() - 60000, status: "delivered" },
    ],
    isRecipientTyping: true,
  }} />,
};
