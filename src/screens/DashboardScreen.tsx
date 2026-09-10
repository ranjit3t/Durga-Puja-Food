/**
 * Operational Dashboard for tracking meal demands and collections.
 * Provides aggregated counts for kitchen planning and guest entry management.
 */
import React, { memo } from "react";
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../styles";
import { UI_TEXT } from "../strings";
import {
  getDayLabel,
  isMealEnabled,
  isDietaryEnabled,
  isParcelEnabled,
} from "../constants";
import { FoodMenu, MealMenu, UserRole, ConfigDay } from "../types";
import { BackButton } from "../components/common/BackButton";
import { MealSummaryInline } from "../components/menu/MealSummaryInline";
import { Metric } from "../components/common/Metric";
import { EditableMetric } from "../components/common/EditableMetric";
import { AlertButton } from "../components/common/CustomAlert";

interface MealSectionProps {
  day: string;
  type: "breakfast" | "lunch" | "dinner";
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  total: number;
  veg: number;
  nonVeg: number;
  parcel: number;
  parcelTaken: number;
  taken: number;
  flatVegTaken: number;
  flatNonVegTaken: number;
  guestVeg: number;
  guestNonVeg: number;
  guestVegTaken: number;
  guestNonVegTaken: number;
  menu: MealMenu;
  userRole: UserRole;
  config: ConfigDay[];
  onUpdateGuest: (
    day: string,
    type: "breakfast" | "lunch" | "dinner",
    field:
      | "guestVeg"
      | "guestNonVeg"
      | "guestTaken"
      | "guestVegTaken"
      | "guestNonVegTaken",
    value: number
  ) => void;
  showAlert: (title: string, message: string, buttons?: AlertButton[]) => void;
  labels: {
    veg: string;
    nonVeg: string;
    parcel: string;
    parcelTaken: string;
    taken: string;
    guestVeg: string;
    guestNonVeg: string;
    guestVegTaken: string;
    guestNonVegTaken: string;
    vegTaken: string;
    nonVegTaken: string;
  };
}

/**
 * Renders a specific meal category (e.g. Lunch) with its demand metrics.
 */
const DashboardMealSection = memo(
  ({
    day,
    type,
    title,
    icon,
    total,
    veg,
    nonVeg,
    parcel,
    parcelTaken,
    taken,
    flatVegTaken,
    flatNonVegTaken,
    guestVeg,
    guestNonVeg,
    guestVegTaken,
    guestNonVegTaken,
    menu,
    userRole,
    config,
    onUpdateGuest,
    showAlert,
    labels,
  }: MealSectionProps) => {
    const vegItems = menu?.veg || [];
    const nonVegItems = menu?.nonVeg || [];
    const isAdmin = userRole === "admin";

    const totalVegTaken = flatVegTaken + guestVegTaken;
    const totalNonVegTaken = flatNonVegTaken + guestNonVegTaken;
    const totalMealTaken = totalVegTaken + totalNonVegTaken;

    return (
      <View style={styles.dashboardMealSection}>
        <View style={[styles.mealDisplayHeader, { marginBottom: 10 }]}>
          <Ionicons name={icon} size={20} color="#356044" />
          <Text style={[styles.mealDisplayTitle, { fontSize: 16 }]}>
            {title}
          </Text>
        </View>

        {/* Menu Quick-View */}
        {(vegItems.length > 0 || nonVegItems.length > 0) && (
          <View style={{ gap: 8, marginBottom: 12 }}>
            {isDietaryEnabled(day, type, "veg", config) && vegItems.length > 0 && (
              <View style={[styles.menuBox, { marginBottom: 0, marginTop: 0 }]}>
                <MealSummaryInline
                  label={UI_TEXT.veg}
                  dayId={day}
                  mealKey={type}
                  config={config}
                  menu={{ veg: vegItems, nonVeg: [] }}
                />
              </View>
            )}
            {isDietaryEnabled(day, type, "nonVeg", config) &&
              nonVegItems.length > 0 && (
                <View
                  style={[styles.menuBox, { marginBottom: 0, marginTop: 0 }]}
                >
                  <MealSummaryInline
                    label={UI_TEXT.nonVeg}
                    dayId={day}
                    mealKey={type}
                    config={config}
                    menu={{ veg: [], nonVeg: nonVegItems }}
                  />
                </View>
              )}
          </View>
        )}

        {/* Aggregated Demand Metrics */}
        <View style={styles.metricGrid}>
          <Metric icon="people-outline" label={UI_TEXT.total} value={total} />
          {isDietaryEnabled(day, type, "veg", config) && (
            <Metric icon="leaf-outline" label={labels.veg} value={veg} />
          )}
          {isDietaryEnabled(day, type, "nonVeg", config) && (
            <Metric icon="flame-outline" label={labels.nonVeg} value={nonVeg} />
          )}
          {isParcelEnabled(day, type, config) && (
            <>
              <Metric icon="cube-outline" label={labels.parcel} value={parcel} />
              <Metric
                icon="checkmark-circle-outline"
                label={labels.parcelTaken}
                value={parcelTaken}
              />
            </>
          )}

          {/* New Metrics: Veg/Non-Veg Taken (Total) */}
          {isDietaryEnabled(day, type, "veg", config) && (
            <Metric
              icon="checkmark-done-outline"
              label={labels.vegTaken}
              value={totalVegTaken}
            />
          )}
          {isDietaryEnabled(day, type, "nonVeg", config) && (
            <Metric
              icon="checkmark-done-outline"
              label={labels.nonVegTaken}
              value={totalNonVegTaken}
            />
          )}
          <Metric
            icon="checkmark-done-outline"
            label={UI_TEXT.total + " " + UI_TEXT.taken}
            value={totalMealTaken}
          />

          {/* Guest Management (Editable by Admin) */}
          {isAdmin ? (
            <>
              {isDietaryEnabled(day, type, "veg", config) && (
                <EditableMetric
                  icon="leaf-outline"
                  label={labels.guestVeg}
                  value={guestVeg}
                  onSave={(val) => onUpdateGuest(day, type, "guestVeg", val)}
                  showAlert={showAlert}
                />
              )}
              {isDietaryEnabled(day, type, "nonVeg", config) && (
                <EditableMetric
                  icon="flame-outline"
                  label={labels.guestNonVeg}
                  value={guestNonVeg}
                  onSave={(val) => onUpdateGuest(day, type, "guestNonVeg", val)}
                  showAlert={showAlert}
                />
              )}
            </>
          ) : (
            <>
              {isDietaryEnabled(day, type, "veg", config) && (
                <Metric
                  icon="leaf-outline"
                  label={labels.guestVeg}
                  value={guestVeg}
                />
              )}
              {isDietaryEnabled(day, type, "nonVeg", config) && (
                <Metric
                  icon="flame-outline"
                  label={labels.guestNonVeg}
                  value={guestNonVeg}
                />
              )}
            </>
          )}

          {/* Guest Taken Management (Editable by Admin/Vendor) */}
          {isDietaryEnabled(day, type, "veg", config) && (
            <EditableMetric
              icon="checkbox-outline"
              label={labels.guestVegTaken}
              value={guestVegTaken}
              onSave={(val) => onUpdateGuest(day, type, "guestVegTaken", val)}
              validate={(val) => val <= guestVeg || UI_TEXT.guestTakenError}
              showAlert={showAlert}
            />
          )}
          {isDietaryEnabled(day, type, "nonVeg", config) && (
            <EditableMetric
              icon="checkbox-outline"
              label={labels.guestNonVegTaken}
              value={guestNonVegTaken}
              onSave={(val) => onUpdateGuest(day, type, "guestNonVegTaken", val)}
              validate={(val) => val <= guestNonVeg || UI_TEXT.guestTakenError}
              showAlert={showAlert}
            />
          )}

          <Metric
            icon="people-circle-outline"
            label={UI_TEXT.guestTaken}
            value={guestVegTaken + guestNonVegTaken}
          />
        </View>
      </View>
    );
  }
);

export function DashboardScreen({
  data,
  userRole,
  totalCollection,
  upiCollection,
  cashCollection,
  menu,
  config,
  onUpdateMenu,
  onBack,
  showAlert,
}: {
  data: Array<any>;
  userRole: UserRole;
  totalCollection: number;
  upiCollection: number;
  cashCollection: number;
  menu: FoodMenu;
  config: ConfigDay[];
  onUpdateMenu: (menu: FoodMenu) => Promise<void>;
  onBack: () => void;
  showAlert: (title: string, message: string, buttons?: AlertButton[]) => void;
}) {
  const emptyMeal = {
    veg: [],
    nonVeg: [],
    guestVeg: 0,
    guestNonVeg: 0,
    guestTaken: 0,
    guestVegTaken: 0,
    guestNonVegTaken: 0,
  };

  const activeDays = config.filter((d) => d.enabled).map((d) => d.id);

  /**
   * Updates guest count or status in the global Food Menu.
   */
  const onUpdateGuest = (
    day: string,
    type: "breakfast" | "lunch" | "dinner",
    field:
      | "guestVeg"
      | "guestNonVeg"
      | "guestTaken"
      | "guestVegTaken"
      | "guestNonVegTaken",
    value: number
  ) => {
    const updatedMenu = { ...menu };
    const updatedDay = { ...updatedMenu[day as any] };
    const updatedMeal = { ...updatedDay[type] };

    // Update the specific field
    updatedMeal[field] = value;

    // Maintain guestTaken as summation of Veg and Non-veg taken
    if (field === "guestVegTaken" || field === "guestNonVegTaken") {
      updatedMeal.guestTaken =
        (updatedMeal.guestVegTaken || 0) + (updatedMeal.guestNonVegTaken || 0);
    }

    updatedDay[type] = updatedMeal;
    updatedMenu[day as any] = updatedDay;
    onUpdateMenu(updatedMenu);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <StatusBar style="light" />
      <View style={styles.header}>
        <BackButton onPress={onBack} />
        <Text style={styles.eyebrow}>{UI_TEXT.operations}</Text>
        <Text style={styles.title}>{UI_TEXT.dashboardTitle}</Text>
        <Text style={styles.subtitle}>{UI_TEXT.dashboardSubtitle}</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Financial Overview */}
        <View style={styles.collectionCard}>
          <Ionicons name="wallet-outline" size={25} color="#7b5a2d" />
          <View>
            <Text style={styles.summaryLabel}>{UI_TEXT.totalCollection}</Text>
            <Text style={styles.collectionAmount}>
              {UI_TEXT.rs} {totalCollection.toFixed(2)}
            </Text>
            <Text style={styles.collectionBreakdown}>
              UPI {UI_TEXT.rs} {upiCollection.toFixed(2)} | Cash {UI_TEXT.rs}{" "}
              {cashCollection.toFixed(2)}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{UI_TEXT.dailyMealDemand}</Text>

        {/* Daily Demand Matrices */}
        {activeDays.map((day, index) => {
          const item = data[index] || {};
          const dayMenu = menu[day] || {
            breakfast: emptyMeal,
            lunch: emptyMeal,
            dinner: emptyMeal,
          };

          return (
            <View key={day} style={styles.dashboardCard}>
              <View style={[styles.dashboardCardTop, { marginBottom: 16 }]}>
                <Text style={styles.dashboardDay}>{getDayLabel(day, config)}</Text>
              </View>

              {isMealEnabled(day, "breakfast", config) && (
                <DashboardMealSection
                  day={day}
                  type="breakfast"
                  title={UI_TEXT.breakfast}
                  icon="sunny-outline"
                  total={item.breakfast || 0}
                  veg={item.breakfastVeg || 0}
                  nonVeg={item.breakfastNonVeg || 0}
                  parcel={item.breakfastParcel || 0}
                  parcelTaken={item.breakfastParcelTaken || 0}
                  taken={item.breakfastTaken || 0}
                  flatVegTaken={item.breakfastFlatVegTaken || 0}
                  flatNonVegTaken={item.breakfastFlatNonVegTaken || 0}
                  guestVeg={item.breakfastGuestVeg || 0}
                  guestNonVeg={item.breakfastGuestNonVeg || 0}
                  guestVegTaken={item.breakfastGuestVegTaken || 0}
                  guestNonVegTaken={item.breakfastGuestNonVegTaken || 0}
                  menu={dayMenu.breakfast}
                  userRole={userRole}
                  config={config}
                  onUpdateGuest={onUpdateGuest}
                  showAlert={showAlert}
                  labels={{
                    veg: UI_TEXT.bVeg,
                    nonVeg: UI_TEXT.bNonVeg,
                    parcel: UI_TEXT.bParcel,
                    parcelTaken: UI_TEXT.bP_Taken,
                    taken: UI_TEXT.bTaken,
                    guestVeg: UI_TEXT.guestVeg,
                    guestNonVeg: UI_TEXT.guestNonVeg,
                    guestVegTaken: UI_TEXT.guestVegTaken,
                    guestNonVegTaken: UI_TEXT.guestNonVegTaken,
                    vegTaken: UI_TEXT.vegTaken,
                    nonVegTaken: UI_TEXT.nonVegTaken,
                  }}
                />
              )}

              {isMealEnabled(day, "lunch", config) && (
                <DashboardMealSection
                  day={day}
                  type="lunch"
                  title={UI_TEXT.lunch}
                  icon="restaurant-outline"
                  total={item.lunch || 0}
                  veg={item.lunchVeg || 0}
                  nonVeg={item.lunchNonVeg || 0}
                  parcel={item.lunchParcel || 0}
                  parcelTaken={item.lunchParcelTaken || 0}
                  taken={item.lunchTaken || 0}
                  flatVegTaken={item.lunchFlatVegTaken || 0}
                  flatNonVegTaken={item.lunchFlatNonVegTaken || 0}
                  guestVeg={item.lunchGuestVeg || 0}
                  guestNonVeg={item.lunchGuestNonVeg || 0}
                  guestVegTaken={item.lunchGuestVegTaken || 0}
                  guestNonVegTaken={item.lunchGuestNonVegTaken || 0}
                  menu={dayMenu.lunch}
                  userRole={userRole}
                  config={config}
                  onUpdateGuest={onUpdateGuest}
                  showAlert={showAlert}
                  labels={{
                    veg: UI_TEXT.lVeg,
                    nonVeg: UI_TEXT.lNonVeg,
                    parcel: UI_TEXT.lParcel,
                    parcelTaken: UI_TEXT.lP_Taken,
                    taken: UI_TEXT.lTaken,
                    guestVeg: UI_TEXT.guestVeg,
                    guestNonVeg: UI_TEXT.guestNonVeg,
                    guestVegTaken: UI_TEXT.guestVegTaken,
                    guestNonVegTaken: UI_TEXT.guestNonVegTaken,
                    vegTaken: UI_TEXT.vegTaken,
                    nonVegTaken: UI_TEXT.nonVegTaken,
                  }}
                />
              )}

              {isMealEnabled(day, "dinner", config) && (
                <DashboardMealSection
                  day={day}
                  type="dinner"
                  title={UI_TEXT.dinner}
                  icon="moon-outline"
                  total={item.dinner || 0}
                  veg={item.dinnerVeg || 0}
                  nonVeg={item.dinnerNonVeg || 0}
                  parcel={item.dinnerParcel || 0}
                  parcelTaken={item.dinnerParcelTaken || 0}
                  taken={item.dinnerTaken || 0}
                  flatVegTaken={item.dinnerFlatVegTaken || 0}
                  flatNonVegTaken={item.dinnerFlatNonVegTaken || 0}
                  guestVeg={item.dinnerGuestVeg || 0}
                  guestNonVeg={item.dinnerGuestNonVeg || 0}
                  guestVegTaken={item.dinnerGuestVegTaken || 0}
                  guestNonVegTaken={item.dinnerGuestNonVegTaken || 0}
                  menu={dayMenu.dinner}
                  userRole={userRole}
                  config={config}
                  onUpdateGuest={onUpdateGuest}
                  showAlert={showAlert}
                  labels={{
                    veg: UI_TEXT.dVeg,
                    nonVeg: UI_TEXT.dNonVeg,
                    parcel: UI_TEXT.dParcel,
                    parcelTaken: UI_TEXT.dP_Taken,
                    taken: UI_TEXT.dTaken,
                    guestVeg: UI_TEXT.guestVeg,
                    guestNonVeg: UI_TEXT.guestNonVeg,
                    guestVegTaken: UI_TEXT.guestVegTaken,
                    guestNonVegTaken: UI_TEXT.guestNonVegTaken,
                    vegTaken: UI_TEXT.vegTaken,
                    nonVegTaken: UI_TEXT.nonVegTaken,
                  }}
                />
              )}
            </View>
          );
        })}
        <View style={styles.footer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
