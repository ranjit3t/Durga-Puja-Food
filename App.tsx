/**
 * Eternia Food Desk - App Entry Point
 * Manages global state, session handling, and top-level navigation.
 */
import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  ImageBackground,
  ActivityIndicator,
  Pressable,
  Text,
  LogBox,
  BackHandler,
  ScrollView,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import { Ionicons } from "@expo/vector-icons";

// --- Internal Modules ---
import {
  createFirebaseRepository,
  firebaseRepositoryConfigured,
} from "./src/repository";
import { firebaseMissingConfig } from "./src/firebase";
import { UI_TEXT } from "./src/strings";
import { useStyles } from "./src/styles";
import { ThemeProvider, useAppTheme } from "./src/theme";
import {
  getActiveDays,
  emptyMeals,
  mealChoicesFromMeals,
  mealSlotsFromChoices,
  qrValueFor,
  emptyTaken,
  isMealEnabled,
  isDietaryEnabled,
  isParcelEnabled,
} from "./src/constants";
import { Screen, Subscription, FoodMenu, UserRole, ConfigDay, Day, ReportType } from "./src/types";

// --- Screen Components ---
import { DetailsScreen } from "./src/screens/DetailsScreen";
import { ViewMenuScreen } from "./src/screens/ViewMenuScreen";
import { MenuEditorScreen } from "./src/screens/MenuEditorScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { ScannerScreen } from "./src/screens/ScannerScreen";
import { QrScreen } from "./src/screens/QrScreen";
import { SubscriptionForm } from "./src/screens/SubscriptionForm";
import { LoginScreen } from "./src/screens/LoginScreen";
import { ReportScreen } from "./src/screens/ReportScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { SubscriptionListScreen } from "./src/screens/SubscriptionListScreen";
import { ActionLabel } from "./src/components/common/ActionLabel";
import { LogoutButton } from "./src/components/common/LogoutButton";
import { CustomAlert, AlertButton } from "./src/components/common/CustomAlert";

const repository = createFirebaseRepository();

const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

// Suppress framework noise from older libraries used in Expo Go / peer dependencies
LogBox.ignoreLogs([
  "ProgressBarAndroid has been extracted",
  "SafeAreaView has been deprecated",
  "Clipboard has been extracted",
  "InteractionManager has been deprecated",
  "PushNotificationIOS has been extracted",
]);

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

function AppContent() {
  // --- Global State ---
  const { theme, toggleTheme, themeType } = useAppTheme();
  const styles = useStyles();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [screen, setScreen] = useState<Screen>("login");
  const [history, setHistory] = useState<Screen[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<Subscription | null>(
    null
  );
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [dayConfig, setDayConfig] = useState<ConfigDay[]>([]);
  const [seasonName, setSeasonName] = useState("");
  const [seasonEnabled, setSeasonEnabled] = useState(true);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>({
    enabled: true,
    options: { upi: true, cash: true, bankTransfer: true }
  });
  const [guestEnabled, setGuestEnabled] = useState(true);
  const [foodMenu, setFoodMenu] = useState<FoodMenu>({});
  const [firebaseError, setFirebaseError] = useState("");

  // Persistent View State (to keep tabs/filters active when navigating back)
  const [reportType, setReportType] = useState<ReportType>("day");
  const [reportDayId, setReportDayId] = useState<Day>("");
  const [reportMealType, setReportMealType] = useState<"breakfast" | "lunch" | "dinner">("breakfast");
  const [subscriptionSearch, setSubscriptionListSearch] = useState("");

  // Custom Alert State
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons?: AlertButton[];
  }>({
    visible: false,
    title: "",
    message: "",
  });

  const showAlert = (
    title: string,
    message: string,
    buttons?: AlertButton[]
  ) => {
    setAlertConfig({ visible: true, title, message, buttons });
  };

  /**
   * Loads all operational data from Firebase.
   */
  const refreshAllData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      if (!firebaseRepositoryConfigured) {
        setFirebaseError(firebaseMissingConfig.join(", "));
        return;
      }
      const [subs, config, menu] = await Promise.all([
        repository.list(),
        repository.getConfig(),
        repository.getMenu(),
      ]);
      setSubscriptions(subs);
      setDayConfig(config.days);
      setSeasonName(config.seasonName);
      setSeasonEnabled(config.seasonEnabled !== false);
      if (config.payment) setPaymentConfig(config.payment);
      setGuestEnabled(config.guestEnabled !== false); // Default to true
      setFoodMenu(menu);
      setFirebaseError("");
    } catch (err: any) {
      console.error("Sync error:", err);
      setFirebaseError(err.message || "Could not sync with database.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  /**
   * Initializes the session and validates connection.
   */
  useEffect(() => {
    if (userRole) {
      void refreshAllData();
    }
  }, [userRole]);

  // 1. Core Sync Effect: Refresh data silently on every screen transition
  useEffect(() => {
    if (userRole && screen !== "login") {
      // Always use silent refresh for screen transitions to avoid flickering.
      // The initial loader triggered by handleLogin will be cleared by the first sync's finally block.
      void refreshAllData(true);
    }
  }, [screen, userRole]);

  // 2. Periodic Background Sync: Refresh data every 10 seconds when on the same screen
  // Also checks if session has expired (24h limit)
  useEffect(() => {
    if (!userRole || screen === "login") return;

    const interval = setInterval(() => {
      // Check session expiration
      if (sessionStartTime) {
        if (Date.now() - sessionStartTime >= SESSION_TIMEOUT) {
          handleLogout();
          return;
        }
      }

      void refreshAllData(true);
    }, 10000); // 10,000ms = 10 seconds

    return () => clearInterval(interval);
  }, [screen, userRole, sessionStartTime]);

  /**
   * Resets persistent view states to defaults.
   */
  const resetViewStates = () => {
    setReportType("day");
    setReportDayId("");
    setReportMealType("breakfast");
    setSubscriptionListSearch("");
  };

  /**
   * Navigation helper that manages the history stack.
   */
  const navigate = (next: Screen) => {
    if (next === "home") {
      setHistory([]);
      resetViewStates();
    } else if (next !== screen) {
      // If navigating AWAY from home to anywhere else, start with fresh states
      if (screen === "home") {
        resetViewStates();
      }
      setHistory((prev) => [...prev, screen]);
    }
    setScreen(next);
  };

  const goBack = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory((current) => current.slice(0, -1));

      // If returning to home, ensure history and states are clean
      if (prev === "home") {
        setHistory([]);
        resetViewStates();
      }

      setScreen(prev);
      return true;
    }
    if (screen !== "home" && screen !== "login") {
      navigate("home");
      return true;
    }
    return false; // Exit app
  };

  /**
   * Native hardware back button handling.
   * Ensures physical back button logic matches in-app navigation flow.
   */
  useEffect(() => {
    if (Platform.OS === "web") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", goBack);
    return () => subscription.remove();
  }, [screen, history]);

  /**
   * Handles user authentication and transitions to the Home screen.
   */
  const handleLogin = (role: UserRole) => {
    setLoading(true);
    setUserRole(role);
    setSessionStartTime(Date.now());
    navigate("home");
  };

  const handleLogout = () => {
    setUserRole(null);
    setSessionStartTime(null);
    setScreen("login");
    setHistory([]);
    setSubscriptions([]);
    setDayConfig([]);
    setFoodMenu({});
    setReportType("day");
    setReportDayId("");
    setReportMealType("breakfast");
    setSubscriptionListSearch("");
  };

  /**
   * Transitions to the Add Pass form with blank state.
   */
  const startNew = () => {
    const newId = "";
    setEditing({
      id: newId,
      flat: "",
      block: "1",
      peopleCount: 1,
      meals: emptyMeals(dayConfig),
      mealByPerson: mealChoicesFromMeals(emptyMeals(dayConfig), 1, dayConfig),
      mealSlots: mealSlotsFromChoices({}, 1, dayConfig),
      takenByPerson: emptyTaken(1, dayConfig),
      paymentMode: "UPI",
      amount: "0",
    });
    navigate("form");
  };

  /**
   * Saves or updates a flat subscription.
   */
  const updateSubscription = async (sub: Subscription) => {
    try {
      await repository.upsert(sub);
      await refreshAllData(true);
      setSelectedId(sub.id);
      setSelectedRecord(sub);
      navigate("details");
      return true;
    } catch (err) {
      showAlert(UI_TEXT.error, UI_TEXT.saveFailed);
      return false;
    }
  };

  const deleteSubscription = async (id: string) => {
    try {
      await repository.remove(id);
      await refreshAllData(true);
      navigate("home");
    } catch (err) {
      showAlert(UI_TEXT.error, "Could not delete record");
    }
  };

  const handleUpdateConfig = async (config: AppConfig) => {
    try {
      await repository.updateConfig(config);

      // Clean up Menu data for deleted days
      const activeDayIds = config.days.map(d => d.id);
      const updatedMenu = { ...foodMenu };
      let menuChanged = false;

      Object.keys(updatedMenu).forEach(dayId => {
        if (!activeDayIds.includes(dayId)) {
          delete updatedMenu[dayId];
          menuChanged = true;
        }
      });

      if (menuChanged) {
        await repository.updateMenu(updatedMenu);
        setFoodMenu(updatedMenu);
      }

      setDayConfig(config.days);
      setSeasonName(config.seasonName);
      setSeasonEnabled(config.seasonEnabled !== false);
      if (config.payment) setPaymentConfig(config.payment);
      setGuestEnabled(config.guestEnabled !== false);
      await refreshAllData(true);
    } catch (err) {
      showAlert(UI_TEXT.error, "Could not save configuration");
    }
  };

  const handleUpdateMenu = async (menu: FoodMenu) => {
    try {
      await repository.updateMenu(menu);
      setFoodMenu(menu);
      await refreshAllData(true);
    } catch (err) {
      showAlert(UI_TEXT.error, UI_TEXT.couldNotUpdateMenu);
    }
  };

  const shareQr = async (uri: string, message?: string) => {
    // Standard Web Fallback: Download the image
    if (Platform.OS === "web") {
      try {
        const link = document.createElement("a");
        link.href = uri;
        link.download = `Pass-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      } catch (err) {
        console.error("Web download error:", err);
        showAlert("Error", "Could not download pass image.");
        return;
      }
    }

    if (!(await Sharing.isAvailableAsync())) {
      showAlert("Error", "Sharing is not available on this device");
      return;
    }

    try {
      await Sharing.shareAsync(uri, {
        dialogTitle: message || UI_TEXT.shareQrDialog,
        mimeType: 'image/png',
        UTI: 'public.png',
      });
    } catch (err) {
      console.error("Share error:", err);
    }
  };

  const printPass = async (html: string) => {
    try {
      await Print.printAsync({ html });
    } catch (err) {
      showAlert("Error", "Could not print pass");
    }
  };

  /**
   * Navigates to a flat detail screen by searching its ID.
   */
  const openScannedValue = (val: string) => {
    const match = subscriptions.find((s) => qrValueFor(s.id) === val);
    if (match) {
      setSelectedId(match.id);
      setSelectedRecord(match);
      navigate("details");
    } else {
      showAlert(UI_TEXT.error, UI_TEXT.scanError);
      navigate("home");
    }
  };



  /**
   * Memoized dashboard metrics.
   */
  const dashboard = useMemo(() => {
    const uniqueSubscriptions = Array.from(
      new Map(subscriptions.map((s) => [s.id, s])).values()
    );

    const activeDays = getActiveDays(dayConfig);
    if (activeDays.length === 0) return [];

    return activeDays.map((day) => {
      const dayMenu = foodMenu[day];
      const dayConf = dayConfig.find((d) => d.id === day);

      const initialTotals = {
        people: 0,
        breakfast: guestEnabled ? (
          (dayMenu?.breakfast?.guestVeg || 0) +
          (dayMenu?.breakfast?.guestNonVeg || 0)
        ) : 0,
        breakfastVeg: guestEnabled ? (dayMenu?.breakfast?.guestVeg || 0) : 0,
        breakfastNonVeg: guestEnabled ? (dayMenu?.breakfast?.guestNonVeg || 0) : 0,
        breakfastParcel: 0,
        breakfastParcelTaken: 0,
        breakfastTaken: guestEnabled ? (
          (dayMenu?.breakfast?.guestVegTaken || 0) +
          (dayMenu?.breakfast?.guestNonVegTaken || 0)
        ) : 0,
        breakfastGuestVeg: guestEnabled ? (dayMenu?.breakfast?.guestVeg || 0) : 0,
        breakfastGuestNonVeg: guestEnabled ? (dayMenu?.breakfast?.guestNonVeg || 0) : 0,
        breakfastGuestTaken: guestEnabled ? (
          (dayMenu?.breakfast?.guestVegTaken || 0) +
          (dayMenu?.breakfast?.guestNonVegTaken || 0)
        ) : 0,
        breakfastGuestVegTaken: guestEnabled ? (dayMenu?.breakfast?.guestVegTaken || 0) : 0,
        breakfastGuestNonVegTaken: guestEnabled ? (dayMenu?.breakfast?.guestNonVegTaken || 0) : 0,
        breakfastFlatVegTaken: 0,
        breakfastFlatNonVegTaken: 0,

        lunch: guestEnabled ? (dayMenu?.lunch?.guestVeg || 0) + (dayMenu?.lunch?.guestNonVeg || 0) : 0,
        lunchVeg: guestEnabled ? (dayMenu?.lunch?.guestVeg || 0) : 0,
        lunchNonVeg: guestEnabled ? (dayMenu?.lunch?.guestNonVeg || 0) : 0,
        lunchParcel: 0,
        lunchParcelTaken: 0,
        lunchTaken: guestEnabled ? (
          (dayMenu?.lunch?.guestVegTaken || 0) +
          (dayMenu?.lunch?.guestNonVegTaken || 0)
        ) : 0,
        lunchGuestVeg: guestEnabled ? (dayMenu?.lunch?.guestVeg || 0) : 0,
        lunchGuestNonVeg: guestEnabled ? (dayMenu?.lunch?.guestNonVeg || 0) : 0,
        lunchGuestTaken: guestEnabled ? (
          (dayMenu?.lunch?.guestVegTaken || 0) +
          (dayMenu?.lunch?.guestNonVegTaken || 0)
        ) : 0,
        lunchGuestVegTaken: guestEnabled ? (dayMenu?.lunch?.guestVegTaken || 0) : 0,
        lunchGuestNonVegTaken: guestEnabled ? (dayMenu?.lunch?.guestNonVegTaken || 0) : 0,
        lunchFlatVegTaken: 0,
        lunchFlatNonVegTaken: 0,

        dinner: guestEnabled ? (
          (dayMenu?.dinner?.guestVeg || 0) + (dayMenu?.dinner?.guestNonVeg || 0)
        ) : 0,
        dinnerVeg: guestEnabled ? (dayMenu?.dinner?.guestVeg || 0) : 0,
        dinnerNonVeg: guestEnabled ? (dayMenu?.dinner?.guestNonVeg || 0) : 0,
        dinnerParcel: 0,
        dinnerParcelTaken: 0,
        dinnerTaken: guestEnabled ? (
          (dayMenu?.dinner?.guestVegTaken || 0) +
          (dayMenu?.dinner?.guestNonVegTaken || 0)
        ) : 0,
        dinnerGuestVeg: guestEnabled ? (dayMenu?.dinner?.guestVeg || 0) : 0,
        dinnerGuestNonVeg: guestEnabled ? (dayMenu?.dinner?.guestNonVeg || 0) : 0,
        dinnerGuestTaken: guestEnabled ? (
          (dayMenu?.dinner?.guestVegTaken || 0) +
          (dayMenu?.dinner?.guestNonVegTaken || 0)
        ) : 0,
        dinnerGuestVegTaken: guestEnabled ? (dayMenu?.dinner?.guestVegTaken || 0) : 0,
        dinnerGuestNonVegTaken: guestEnabled ? (dayMenu?.dinner?.guestNonVegTaken || 0) : 0,
        dinnerFlatVegTaken: 0,
        dinnerFlatNonVegTaken: 0,
      };

      return uniqueSubscriptions.reduce((totals, item) => {
        const mealSlots = item.mealSlots?.[day] || [];
        const takenByPerson = item.takenByPerson?.[day] || [];

        mealSlots.forEach((slots, index) => {
          const taken = takenByPerson?.[index];

          // Breakfast
          if (isMealEnabled(day, "breakfast", dayConfig) && slots?.breakfast && slots.breakfast !== "None") {
             const diet = slots.breakfast === "Veg" ? "veg" : "nonVeg";
             if (isDietaryEnabled(day, "breakfast", diet, dayConfig)) {
                totals.breakfast += 1;
                if (slots.breakfast === "Veg") totals.breakfastVeg += 1;
                else totals.breakfastNonVeg += 1;
                if (isParcelEnabled(day, "breakfast", dayConfig) && slots.breakfastParcel) {
                  totals.breakfastParcel += 1;
                  if (taken?.breakfast) totals.breakfastParcelTaken += 1;
                }
                if (taken?.breakfast) {
                  totals.breakfastTaken += 1;
                  if (slots.breakfast === "Veg") totals.breakfastFlatVegTaken += 1;
                  else totals.breakfastFlatNonVegTaken += 1;
                }
             }
          }

          // Lunch
          if (isMealEnabled(day, "lunch", dayConfig) && slots?.lunch && slots.lunch !== "None") {
            const diet = slots.lunch === "Veg" ? "veg" : "nonVeg";
            if (isDietaryEnabled(day, "lunch", diet, dayConfig)) {
              totals.lunch += 1;
              if (slots.lunch === "Veg") totals.lunchVeg += 1;
              else totals.lunchNonVeg += 1;
              if (isParcelEnabled(day, "lunch", dayConfig) && slots.lunchParcel) {
                totals.lunchParcel += 1;
                if (taken?.lunch) totals.lunchParcelTaken += 1;
              }
              if (taken?.lunch) {
                totals.lunchTaken += 1;
                if (slots.lunch === "Veg") totals.lunchFlatVegTaken += 1;
                else totals.lunchFlatNonVegTaken += 1;
              }
            }
          }

          // Dinner
          if (isMealEnabled(day, "dinner", dayConfig) && slots?.dinner && slots.dinner !== "None") {
            const diet = slots.dinner === "Veg" ? "veg" : "nonVeg";
            if (isDietaryEnabled(day, "dinner", diet, dayConfig)) {
              totals.dinner += 1;
              if (slots.dinner === "Veg") totals.dinnerVeg += 1;
              else totals.dinnerNonVeg += 1;
              if (isParcelEnabled(day, "dinner", dayConfig) && slots.dinnerParcel) {
                totals.dinnerParcel += 1;
                if (taken?.dinner) totals.dinnerParcelTaken += 1;
              }
              if (taken?.dinner) {
                totals.dinnerTaken += 1;
                if (slots.dinner === "Veg") totals.dinnerFlatVegTaken += 1;
                else totals.dinnerFlatNonVegTaken += 1;
              }
            }
          }
        });
        return totals;
      }, initialTotals);
    });
  }, [subscriptions, foodMenu, dayConfig]);

  const collections = useMemo(() => {
    let total = 0;
    let upi = 0;
    let cash = 0;
    let bankTransfer = 0;
    subscriptions.forEach((item) => {
      const amt = Number.parseFloat(item.amount) || 0;
      total += amt;
      if (item.paymentMode === "UPI") upi += amt;
      else if (item.paymentMode === "Cash") cash += amt;
      else if (item.paymentMode === "Bank transfer") bankTransfer += amt;
    });
    return { total, upi, cash, bankTransfer };
  }, [subscriptions]);

  const totalPeople = useMemo(() => {
    return subscriptions.reduce((sum, sub) => sum + (sub.peopleCount || 0), 0);
  }, [subscriptions]);

  const selected = subscriptions.find((s) => s.id === selectedId) || selectedRecord;

  // --- Screen Selector ---

  const renderContent = () => {
    if (loading) {
      return (
        <ImageBackground
          source={{
            uri: "https://picsum.photos/id/1080/1200/1800",
          }}
          style={styles.root}
          imageStyle={styles.backgroundImage}
        >
          <View style={[styles.rootOverlay, styles.center]}>
            <ActivityIndicator size="large" color="#c35b3b" />
            <Text style={styles.loadingText}>{UI_TEXT.loading}</Text>
          </View>
        </ImageBackground>
      );
    }

    if (screen === "login" || !userRole) {
      return <LoginScreen onLogin={handleLogin} showAlert={showAlert} repository={repository} />;
    }

    if (screen === "form" && editing) {
      return (
        <SubscriptionForm
          value={editing}
          userRole={userRole}
          config={dayConfig}
          paymentConfig={paymentConfig}
          seasonEnabled={seasonEnabled}
          onCancel={() => {
            goBack();
          }}
          onHome={() => navigate("home")}
          onSave={updateSubscription}
          onSaveQr={
            editing.flat
              ? undefined
              : async (next) => {
                  if (await updateSubscription(next)) navigate("qr");
                }
          }
          onDelete={
            editing.flat
              ? () =>
                  showAlert(
                    UI_TEXT.deleteConfirmTitle,
                    `${UI_TEXT.deleteConfirmMessage}${editing.id}${UI_TEXT.deleteConfirmMessageSuffix}`,
                    [
                      { text: UI_TEXT.cancel, style: "cancel" },
                      {
                        text: UI_TEXT.deleteButton,
                        style: "destructive",
                        onPress: () => void deleteSubscription(editing.id),
                      },
                    ]
                  )
              : undefined
          }
          onLogout={handleLogout}
          lockIdentity={Boolean(editing.flat)}
          showAlert={showAlert}
        />
      );
    }

    if (screen === "qr" && selected) {
      return (
        <QrScreen
          subscription={selected}
          config={dayConfig}
          seasonName={seasonName}
          seasonEnabled={seasonEnabled}
          onBack={goBack}
          onHome={() => navigate("home")}
          onShare={shareQr}
          onPrint={printPass}
          onLogout={handleLogout}
        />
      );
    }

    if (screen === "scanner") {
      return (
        <ScannerScreen
          onBack={goBack}
          onScanned={openScannedValue}
        />
      );
    }

    if (screen === "dashboard") {
      return (
        <DashboardScreen
          data={dashboard}
          userRole={userRole}
          totalCollection={collections.total}
          upiCollection={collections.upi}
          cashCollection={collections.cash}
          bankTransferCollection={collections.bankTransfer}
          menu={foodMenu}
          config={dayConfig}
          paymentConfig={paymentConfig}
          onUpdateMenu={handleUpdateMenu}
          onBack={goBack}
          onHome={() => navigate("home")}
          onLogout={handleLogout}
          showAlert={showAlert}
          guestEnabled={guestEnabled}
          seasonEnabled={seasonEnabled}
        />
      );
    }

    if (screen === "viewMenu") {
      return (
        <ViewMenuScreen
          menu={foodMenu}
          userRole={userRole}
          config={dayConfig}
          onEdit={() => navigate("menu")}
          onBack={goBack}
          onHome={() => navigate("home")}
          onLogout={handleLogout}
          showAlert={showAlert}
          guestEnabled={guestEnabled}
          seasonEnabled={seasonEnabled}
        />
      );
    }

    if (screen === "menu") {
      return (
        <MenuEditorScreen
          menu={foodMenu}
          config={dayConfig}
          onSave={handleUpdateMenu}
          onBack={goBack}
          onHome={() => navigate("home")}
          onLogout={handleLogout}
          showAlert={showAlert}
          guestEnabled={guestEnabled}
          seasonEnabled={seasonEnabled}
        />
      );
    }

    if (screen === "report") {
      return (
        <ReportScreen
          subscriptions={subscriptions}
          menu={foodMenu}
          config={dayConfig}
          seasonName={seasonName}
          paymentConfig={paymentConfig}
          onBack={goBack}
          onHome={() => navigate("home")}
          onShare={shareQr}
          onLogout={handleLogout}
          guestEnabled={guestEnabled}
          reportType={reportType}
          selectedDayId={reportDayId}
          selectedMealType={reportMealType}
          onSetReportType={setReportType}
          onSetSelectedDayId={setReportDayId}
          onSetSelectedMealType={setReportMealType}
          seasonEnabled={seasonEnabled}
          onSelectFlat={(id) => {
            const match = subscriptions.find((s) => s.id === id);
            if (match) {
              setSelectedId(match.id);
              setSelectedRecord(match);
              navigate("details");
            }
          }}
        />
      );
    }

    if (screen === "settings") {
      return (
        <SettingsScreen
          config={dayConfig}
          seasonName={seasonName}
          seasonEnabled={seasonEnabled}
          payment={paymentConfig}
          guestEnabled={guestEnabled}
          onSave={handleUpdateConfig}
          onBack={goBack}
          onHome={() => navigate("home")}
          onLogout={handleLogout}
          showAlert={showAlert}
        />
      );
    }

    if (screen === "subscriptionList") {
      return (
        <SubscriptionListScreen
          subscriptions={subscriptions}
          config={dayConfig}
          paymentConfig={paymentConfig}
          userRole={userRole || "vendor"}
          seasonEnabled={seasonEnabled}
          searchText={subscriptionSearch}
          onSearchChange={setSubscriptionListSearch}
          onBack={goBack}
          onHome={() => navigate("home")}
          onSelect={(sub) => {
            setSelectedId(sub.id);
            setSelectedRecord(sub);
            navigate("details");
          }}
          onAdd={startNew}
          onLogout={handleLogout}
        />
      );
    }

    if (screen === "details" && selected) {
      return (
        <DetailsScreen
          subscription={selected}
          userRole={userRole}
          config={dayConfig}
          paymentConfig={paymentConfig}
          seasonEnabled={seasonEnabled}
          onBack={goBack}
          onHome={() => navigate("home")}
          onEdit={() => {
            setEditing(selected);
            navigate("form");
          }}
          onDelete={() => deleteSubscription(selected.id)}
          onQr={() => navigate("qr")}
          onLogout={handleLogout}
          menu={foodMenu}
          showAlert={showAlert}
        />
      );
    }

    // Default: Home Screen
    return (
      <View style={styles.root}>
        <StatusBar style={themeType === "dark" ? "light" : "dark"} />
        <View style={styles.header}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              height: 40,
              marginBottom: 16,
            }}
          >
            <Pressable onPress={toggleTheme} style={[styles.backButton, { width: 36, height: 36, borderRadius: 18, paddingHorizontal: 0 }]}>
               <Ionicons name={themeType === "dark" ? "sunny-outline" : "moon-outline"} size={18} color={theme.colors.secondary} />
            </Pressable>
            <LogoutButton onLogout={handleLogout} />
          </View>
          <Text style={styles.title}>{UI_TEXT.appName}</Text>
          <Text style={styles.subtitle}>{UI_TEXT.tagline}</Text>
        </View>

        <ScrollView
          style={{ flex: 1, width: "100%" }}
          contentContainerStyle={[styles.content, { paddingBottom: 150 }]}
        >
          {firebaseError ? (
            <View style={styles.firebaseBanner}>
              <Text style={styles.firebaseBannerTitle}>
                {UI_TEXT.offlineMode}
              </Text>
              <Text style={styles.firebaseBannerText}>{firebaseError}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={() => navigate("subscriptionList")}
            style={styles.summary}
          >
            <View>
              {seasonName ? (
                <Text style={[styles.summaryLabel, { marginBottom: 2, color: theme.colors.secondary }]}>
                  {seasonName}
                </Text>
              ) : null}
              <Text style={styles.summaryLabel}>{UI_TEXT.activePasses}</Text>
              <Text style={styles.summaryNumber}>
                {subscriptions.length}
              </Text>
              <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 8 }} />
              <Text style={[styles.summaryLabel, { opacity: 0.8 }]}>{UI_TEXT.totalPeopleLabel}</Text>
              <Text style={[styles.summaryNumber, { fontSize: 24, marginTop: 2 }]}>
                {totalPeople}
              </Text>
            </View>
            <Ionicons name="ticket-outline" size={64} color="rgba(255,255,255,0.3)" />
          </Pressable>

          <View style={styles.compactActions}>
            {userRole === "admin" && seasonEnabled ? (
              <Pressable
                accessibilityLabel={UI_TEXT.addFlat}
                onPress={startNew}
                style={[styles.compactSecondary, { backgroundColor: theme.colors.success, borderColor: theme.colors.success }]}
                disabled={getActiveDays(dayConfig).length === 0}
              >
                <ActionLabel
                  icon="add-circle-outline"
                  label={UI_TEXT.addFlat}
                  color={theme.colors.white}
                  size={22}
                  vertical
                />
              </Pressable>
            ) : null}
            <Pressable
              accessibilityLabel={UI_TEXT.subscriptions}
              onPress={() => navigate("subscriptionList")}
              style={[styles.compactSecondary, { backgroundColor: theme.themeType === 'dark' ? "#1E3A8A" : "#007BFF", borderColor: theme.themeType === 'dark' ? "#1E3A8A" : "#007BFF" }]}
            >
              <ActionLabel
                icon="list-outline"
                label={UI_TEXT.subscriptions}
                color={theme.colors.white}
                size={22}
                vertical
              />
            </Pressable>
            <Pressable
              accessibilityLabel={UI_TEXT.scanQr}
              onPress={() => navigate("scanner")}
              style={[styles.compactSecondary, { backgroundColor: theme.themeType === 'dark' ? "#4C1D95" : "#6F42C1", borderColor: theme.themeType === 'dark' ? "#4C1D95" : "#6F42C1" }]}
            >
              <ActionLabel
                icon="scan-outline"
                label={UI_TEXT.scanQr}
                color={theme.colors.white}
                size={22}
                vertical
              />
            </Pressable>
            <Pressable
              accessibilityLabel={UI_TEXT.dashboard}
              onPress={() => navigate("dashboard")}
              style={[styles.compactSecondary, { backgroundColor: theme.themeType === 'dark' ? "#7C2D12" : "#FD7E14", borderColor: theme.themeType === 'dark' ? "#7C2D12" : "#FD7E14" }]}
            >
              <ActionLabel
                icon="stats-chart-outline"
                label={UI_TEXT.dashboard}
                color={theme.colors.white}
                size={22}
                vertical
              />
            </Pressable>
            <Pressable
              accessibilityLabel={UI_TEXT.report}
              onPress={() => navigate("report")}
              style={[styles.compactSecondary, { backgroundColor: theme.themeType === 'dark' ? "#134E4A" : "#17A2B8", borderColor: theme.themeType === 'dark' ? "#134E4A" : "#17A2B8" }]}
            >
              <ActionLabel
                icon="document-text-outline"
                label={UI_TEXT.report}
                color={theme.colors.white}
                size={22}
                vertical
              />
            </Pressable>
            <Pressable
              accessibilityLabel={UI_TEXT.viewMenu}
              onPress={() => navigate("viewMenu")}
              style={[styles.compactSecondary, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
            >
              <ActionLabel
                icon="restaurant-outline"
                label={UI_TEXT.viewMenu}
                color={theme.colors.white}
                size={22}
                vertical
              />
            </Pressable>
            {userRole === "admin" ? (
              <Pressable
                accessibilityLabel="Settings"
                onPress={() => navigate("settings")}
                style={[styles.compactSecondary, { backgroundColor: theme.colors.textMuted, borderColor: theme.colors.textMuted }]}
              >
                <ActionLabel
                  icon="settings-outline"
                  label="Settings"
                  color={theme.colors.white}
                  size={22}
                  vertical
                />
              </Pressable>
            ) : null}
          </View>
          <View style={styles.footer}>
            <Text style={styles.footerText}>{UI_TEXT.footerCopyright}</Text>
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <>
      {renderContent()}
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig((c) => ({ ...c, visible: false }))}
      />
    </>
  );
}
