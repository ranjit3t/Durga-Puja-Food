import React from "react";
import { ActivityLogScreen } from "./ActivityLogScreen";
import { ContactsScreen } from "./ContactsScreen";
import { DashboardScreen } from "./DashboardScreen";
import { DetailsScreen } from "./DetailsScreen";
import { FoodPackageScreen } from "./FoodPackageScreen";
import { FreeMealManagementScreen } from "./FreeMealManagementScreen";
import { HomeScreen } from "./HomeScreen";
import { LoginScreen } from "./LoginScreen";
import { MenuEditorScreen } from "./MenuEditorScreen";
import { NotesScreen } from "./NotesScreen";
import { QrScreen } from "./QrScreen";
import { ReportScreen } from "./ReportScreen";
import { ScannerScreen } from "./ScannerScreen";
import { SettingsScreen } from "./SettingsScreen";
import { SubscriptionForm } from "./SubscriptionForm";
import { SubscriptionListScreen } from "./SubscriptionListScreen";
import { ViewMenuScreen } from "./ViewMenuScreen";
import { AppNavigator } from "../navigation/AppNavigator";
import { STORY_FIXTURES, StoryMockProvider } from "../../.storybook/storyMocks";

function ListScreenScenario({ children, empty = false }: { children: React.ReactNode; empty?: boolean }) {
  return (
    <StoryMockProvider
      database={{ subscriptions: empty ? [] : STORY_FIXTURES.subscriptions } as any}
      lists={{
        activityLogs: empty ? [] : STORY_FIXTURES.activityLogs,
        notes: empty ? [] : STORY_FIXTURES.notes,
      }}
    >
      {children}
    </StoryMockProvider>
  );
}

export default {
  title: "UI/Screens",
  parameters: {
    controls: { disable: true },
    layout: "fullscreen",
  },
};

export const ActivityLogScreenStory = {
  name: "ActivityLogScreen/RecentEvents",
  render: () => <ListScreenScenario><ActivityLogScreen /></ListScreenScenario>,
};
export const ActivityLogScreenEmptyStory = {
  name: "ActivityLogScreen/Empty",
  render: () => <ListScreenScenario empty><ActivityLogScreen /></ListScreenScenario>,
};
export const ContactsScreenStory = {
  name: "ContactsScreen/ContactList",
  render: () => <ListScreenScenario><ContactsScreen /></ListScreenScenario>,
};
export const ContactsScreenEmptyStory = {
  name: "ContactsScreen/Empty",
  render: () => <ListScreenScenario empty><ContactsScreen /></ListScreenScenario>,
};
export const DashboardScreenStory = { name: "DashboardScreen", render: () => <DashboardScreen /> };
export const DetailsScreenStory = { name: "DetailsScreen", render: () => <DetailsScreen /> };
export const FoodPackageScreenStory = { name: "FoodPackageScreen", render: () => <FoodPackageScreen /> };
export const FreeMealManagementScreenStory = { name: "FreeMealManagementScreen", render: () => <FreeMealManagementScreen /> };
export const HomeScreenStory = { name: "HomeScreen", render: () => <HomeScreen /> };
export const LoginScreenStory = { name: "LoginScreen", render: () => <LoginScreen /> };
export const MenuEditorScreenStory = { name: "MenuEditorScreen", render: () => <MenuEditorScreen /> };
export const NotesScreenStory = {
  name: "NotesScreen/TeamNotes",
  render: () => <ListScreenScenario><NotesScreen /></ListScreenScenario>,
};
export const NotesScreenEmptyStory = {
  name: "NotesScreen/Empty",
  render: () => <ListScreenScenario empty><NotesScreen /></ListScreenScenario>,
};
export const QrScreenStory = { name: "QrScreen", render: () => <QrScreen /> };
export const ReportScreenStory = { name: "ReportScreen", render: () => <ReportScreen /> };
export const ScannerScreenStory = { name: "ScannerScreen", render: () => <ScannerScreen /> };
export const SettingsScreenStory = { name: "SettingsScreen", render: () => <SettingsScreen /> };
export const SubscriptionFormStory = { name: "SubscriptionForm", render: () => <SubscriptionForm /> };
export const SubscriptionListScreenStory = {
  name: "SubscriptionListScreen/Passes",
  render: () => <ListScreenScenario><SubscriptionListScreen /></ListScreenScenario>,
};
export const SubscriptionListScreenEmptyStory = {
  name: "SubscriptionListScreen/Empty",
  render: () => <ListScreenScenario empty><SubscriptionListScreen /></ListScreenScenario>,
};
export const ViewMenuScreenStory = { name: "ViewMenuScreen", render: () => <ViewMenuScreen /> };
export const AppNavigatorStory = { name: "AppNavigator", render: () => <AppNavigator /> };
