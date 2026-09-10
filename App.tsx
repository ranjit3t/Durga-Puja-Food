/**
 * Eternia Food Desk - App Entry Point
 * Manages global state, session handling, and top-level navigation.
 */
import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  ImageBackground,
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Share,
  LogBox,
  BackHandler,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as Linking from "expo-linking";
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
import { styles } from "./src/styles";
import {
  getActiveDays,
  emptyMeals,
  mealChoicesFromMeals,
  mealSlotsFromChoices,
  qrValueFor,
  emptyTaken,
  mealSummary,
  mealsFromChoices,
  isMealEnabled,
  isDietaryEnabled,
  isParcelEnabled,
} from "./src/constants";
import { Screen, Subscription, FoodMenu, UserRole, ConfigDay } from "./src/types";

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
import { ActionLabel } from "./src/components/common/ActionLabel";
import { CustomAlert, AlertButton } from "./src/components/common/CustomAlert";

const repository = createFirebaseRepository();

// Suppress framework noise from older libraries used in Expo Go / peer dependencies
LogBox.ignoreLogs([
  "ProgressBarAndroid has been extracted",
  "SafeAreaView has been deprecated",
  "Clipboard has been extracted",
  "InteractionManager has been deprecated",
  "PushNotificationIOS has been extracted",
]);

export default function App() {
  // --- Global State ---
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [screen, setScreen] = useState<Screen>("login");
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<Subscription | null>(
    null
  );
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [dayConfig, setDayConfig] = useState<ConfigDay[]>([]);
  const [foodMenu, setFoodMenu] = useState<FoodMenu>({});
  const [firebaseError, setFirebaseError] = useState("");
  const [searchText, setSearchText] = useState("");

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

  const showAlert = (title: string, message: string, buttons?: AlertButton[]) => {
    setAlertConfig({ visible: true, title, message, buttons });
  };

  const activeDays = useMemo(() => getActiveDays(dayConfig), [dayConfig]);

  // Derived state for the currently active/selected flat
  const selected =
    selectedRecord?.id === selectedId
      ? selectedRecord
      : subscriptions.find((item) => item.id === selectedId) ??
        subscriptions[0];

  // --- Effects & Data Sync ---
  useEffect(() => {
    // Only begin data synchronization once a user role is assigned
    if (!userRole) return;

    /**
     * Handles deep links (e.g. scanning a QR code with external camera app)
     */
    const openFromLink = async (url: string) => {
      const match = url.match(/flat\/([^/?]+)/);
      if (!match) return;

      const remote = await repository.getByFlatId(match[1]);
      if (remote) {
        setSelectedRecord(remote);
        setSubscriptions((current) =>
          current.some((item) => item.id === remote.id)
            ? current.map((item) => (item.id === remote.id ? remote : item))
            : [...current, remote]
        );
      }

      if (remote || subscriptions.some((item) => item.id === match[1])) {
        setSelectedId(match[1]);
        setScreen("details");
      }
    };

    if (firebaseRepositoryConfigured) {
      // 1. Initial Load of app config
      repository.getConfig().then((config) => {
        if (config && config.length > 0) {
          setDayConfig(config);
        }
      });

      // 2. Initial Load of all flat records
      repository
        .list()
        .then((records) => {
          setSubscriptions(records);
          setLoading(false);
        })
        .catch((error) => {
          setFirebaseError(
            error instanceof Error ? error.message : "Firebase connection failed"
          );
          setLoading(false);
        });

      // 3. Load global menu items
      repository
        .getMenu()
        .then((menu) => setFoodMenu(menu))
        .catch((error) => console.warn("Could not load menu", error));
    } else {
      setFirebaseError(
        `Firebase is not configured. Add: ${firebaseMissingConfig.join(", ")}`
      );
      setLoading(false);
    }

    // Deep link listeners
    Linking.getInitialURL().then((url) => {
      if (url) void openFromLink(url);
    });
    const listener = Linking.addEventListener("url", ({ url }) =>
      openFromLink(url)
    );
    return () => listener.remove();
  }, [userRole]);

  /**
   * Hardware Back Button Support (Android)
   */
  useEffect(() => {
    const handleBackPress = () => {
      if (screen === "home" || screen === "login") {
        return false; // Exit app
      }

      // Logical back-navigation mapping
      if (screen === "details") setScreen("home");
      else if (screen === "viewMenu") setScreen("home");
      else if (screen === "dashboard") setScreen("home");
      else if (screen === "scanner") setScreen("home");
      else if (screen === "qr") setScreen("details");
      else if (screen === "menu") setScreen("viewMenu");
      else if (screen === "report") setScreen("home");
      else if (screen === "settings") setScreen("home");
      else if (screen === "form") {
        setScreen(editing?.flat ? "details" : "home");
      } else {
        setScreen("home");
      }

      return true; // Prevent default behavior (exiting app)
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      handleBackPress
    );
    return () => subscription.remove();
  }, [screen, editing]);

  // --- Session Handlers ---
  const handleLogin = (role: UserRole) => {
    setLoading(true);
    setUserRole(role);
    setScreen("home");
  };

  const handleLogout = () => {
    setUserRole(null);
    setScreen("login");
  };

  // --- Data Persistence Actions ---

  /**
   * Creates or updates a flat subscription record.
   */
  const updateSubscription = async (next: Subscription) => {
    // 1. Validation: Ensure Flat No is not empty
    if (!next.flat.trim()) {
      showAlert(UI_TEXT.error, UI_TEXT.flatNoRequired);
      return false;
    }

    // 2. Check for duplicate flat ID unless we are editing an existing record
    const duplicate = subscriptions.find(
      (item) => item.id.toLowerCase() === next.id.trim().toLowerCase()
    );

    if (duplicate && editing && !editing.flat) {
      setSelectedId(duplicate.id);
      setSelectedRecord(duplicate);
      setEditing(duplicate);
      setScreen("form");
      showAlert(
        UI_TEXT.flatExists,
        `${UI_TEXT.flatExistsMsgPrefix}${duplicate.block}-${duplicate.flat}${UI_TEXT.flatExistsMsgSuffix}`
      );
      return false;
    }

    const amount = next.amount.trim() || "0";

    const record = { ...next, amount };
    try {
      await repository.upsert(record);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Firebase could not save this record.";
      showAlert(UI_TEXT.saveFailed, message);
      return false;
    }

    setSelectedRecord(record);
    setSubscriptions((current) =>
      current.some((item) => item.id === record.id)
        ? current.map((item) => (item.id === record.id ? record : item))
        : [...current, record]
    );

    setSelectedId(record.id);
    setEditing(null);
    setScreen("details");
    return true;
  };

  const deleteSubscription = async (id: string) => {
    try {
      await repository.remove(id);
    } catch (error) {
      console.warn("Could not delete subscription", error);
      return;
    }
    setSubscriptions((current) => current.filter((item) => item.id !== id));
    setSelectedRecord(null);
    setSelectedId("");
    setEditing(null);
    setScreen("home");
  };

  const handleUpdateMenu = async (next: FoodMenu) => {
    try {
      await repository.updateMenu(next);
      setFoodMenu(next);
    } catch (error) {
      showAlert(UI_TEXT.error, UI_TEXT.couldNotUpdateMenu);
    }
  };

  const handleUpdateConfig = async (next: ConfigDay[]) => {
    try {
      await repository.updateConfig(next);
      setDayConfig(next);
    } catch (error) {
      showAlert(UI_TEXT.error, "Could not update settings");
    }
  };

  /**
   * Initializes state for creating a new flat record.
   */
  const startNew = () => {
    if (activeDays.length === 0) {
      showAlert("Configuration Missing", "Please add at least one enabled day in Settings first.");
      return;
    }
    const nextId = `C-${String(subscriptions.length + 1).padStart(3, "0")}`;
    const initialMeals = emptyMeals(dayConfig);
    const initialChoices = mealChoicesFromMeals(initialMeals, 1, dayConfig);
    setEditing({
      id: nextId,
      block: "1",
      flat: "",
      peopleCount: 1,
      meals: initialMeals,
      mealByPerson: initialChoices,
      mealSlots: mealSlotsFromChoices(initialChoices, 1, dayConfig),
      amount: "",
      paymentMode: "UPI",
      takenByPerson: emptyTaken(1, dayConfig),
    });
    setScreen("form");
  };

  // --- Distribution Handlers ---

  const shareQr = async (uri: string) => {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        dialogTitle: `${UI_TEXT.shareQrDialog}${selected.id}`,
      });
    } else {
      Share.share({
        message: `${UI_TEXT.passMessage}${selected.id}: ${qrValueFor(
          selected.id
        )}`,
      });
    }
  };

  const printPass = async () => {
    await Print.printAsync({
      html: `<html><body style="font-family: sans-serif; text-align:center"><h1>${
        UI_TEXT.appName
      }</h1><h2>Flat ${selected.id}</h2><p>${selected.peopleCount}${
        selected.peopleCount === 1 ? UI_TEXT.personSuffix : UI_TEXT.personsSuffix
      }</p><p>${qrValueFor(selected.id)}</p></body></html>`,
    });
  };

  /**
   * Processes a QR value scanned via the internal camera.
   */
  const openScannedValue = async (value: string) => {
    const match =
      value.match(/(?:flat\/|flat=)([^/?&]+)/) ??
      value.match(/^([A-Za-z0-9]+-[A-Za-z0-9]+)$/);
    if (!match) return false;

    const flatId = match[1];
    const remote = await repository.getByFlatId(flatId);
    const record = remote ?? subscriptions.find((item) => item.id === flatId);

    if (!record) return false;

    if (remote) {
      setSubscriptions((current) =>
        current.some((item) => item.id === remote.id)
          ? current.map((item) => (item.id === remote.id ? remote : item))
          : [...current, remote]
      );
    }

    setSelectedId(flatId);
    setScreen("details");
    return true;
  };

  // --- Memoized Analytics & UI Filters ---

  const visibleSubscriptions = useMemo(
    () =>
      subscriptions
        .filter((item) => {
          const query = searchText.trim().toLowerCase();
          return (
            !query ||
            item.block.toLowerCase().includes(query) ||
            item.flat.toLowerCase().includes(query) ||
            item.id.toLowerCase().includes(query)
          );
        })
        .sort(
          (left, right) =>
            left.block.localeCompare(right.block, undefined, {
              numeric: true,
            }) ||
            left.flat.localeCompare(right.flat, undefined, { numeric: true })
        ),
    [subscriptions, searchText]
  );

  /**
   * Memoized dashboard metrics.
   * Aggregates total demand, dietary split, and parcel counts per day.
   */
  const dashboard = useMemo(() => {
    // 1. Deduplicate subscriptions by ID to avoid double-counting "junk" or legacy entries
    const uniqueSubscriptions = Array.from(
      new Map(subscriptions.map((s) => [s.id, s])).values()
    );

    if (activeDays.length === 0) return [];

    return activeDays.map((day) => {
      const dayMenu = foodMenu[day];

      // Initialize totals with Guest values from the Menu
      const initialTotals = {
        people: 0,

        breakfast:
          (dayMenu?.breakfast?.guestVeg || 0) +
          (dayMenu?.breakfast?.guestNonVeg || 0),
        breakfastVeg: dayMenu?.breakfast?.guestVeg || 0,
        breakfastNonVeg: dayMenu?.breakfast?.guestNonVeg || 0,
        breakfastParcel: 0,
        breakfastParcelTaken: 0,
        breakfastTaken:
          (dayMenu?.breakfast?.guestVegTaken || 0) +
          (dayMenu?.breakfast?.guestNonVegTaken || 0),
        breakfastGuestVeg: dayMenu?.breakfast?.guestVeg || 0,
        breakfastGuestNonVeg: dayMenu?.breakfast?.guestNonVeg || 0,
        breakfastGuestTaken:
          (dayMenu?.breakfast?.guestVegTaken || 0) +
          (dayMenu?.breakfast?.guestNonVegTaken || 0),
        breakfastGuestVegTaken: dayMenu?.breakfast?.guestVegTaken || 0,
        breakfastGuestNonVegTaken: dayMenu?.breakfast?.guestNonVegTaken || 0,
        breakfastFlatVegTaken: 0,
        breakfastFlatNonVegTaken: 0,

        lunch:
          (dayMenu?.lunch?.guestVeg || 0) + (dayMenu?.lunch?.guestNonVeg || 0),
        lunchVeg: dayMenu?.lunch?.guestVeg || 0,
        lunchNonVeg: dayMenu?.lunch?.guestNonVeg || 0,
        lunchParcel: 0,
        lunchParcelTaken: 0,
        lunchTaken:
          (dayMenu?.lunch?.guestVegTaken || 0) +
          (dayMenu?.lunch?.guestNonVegTaken || 0),
        lunchGuestVeg: dayMenu?.lunch?.guestVeg || 0,
        lunchGuestNonVeg: dayMenu?.lunch?.guestNonVeg || 0,
        lunchGuestTaken:
          (dayMenu?.lunch?.guestVegTaken || 0) +
          (dayMenu?.lunch?.guestNonVegTaken || 0),
        lunchGuestVegTaken: dayMenu?.lunch?.guestVegTaken || 0,
        lunchGuestNonVegTaken: dayMenu?.lunch?.guestNonVegTaken || 0,
        lunchFlatVegTaken: 0,
        lunchFlatNonVegTaken: 0,

        dinner:
          (dayMenu?.dinner?.guestVeg || 0) +
          (dayMenu?.dinner?.guestNonVeg || 0),
        dinnerVeg: dayMenu?.dinner?.guestVeg || 0,
        dinnerNonVeg: dayMenu?.dinner?.guestNonVeg || 0,
        dinnerParcel: 0,
        dinnerParcelTaken: 0,
        dinnerTaken:
          (dayMenu?.dinner?.guestVegTaken || 0) +
          (dayMenu?.dinner?.guestNonVegTaken || 0),
        dinnerGuestVeg: dayMenu?.dinner?.guestVeg || 0,
        dinnerGuestNonVeg: dayMenu?.dinner?.guestNonVeg || 0,
        dinnerGuestTaken:
          (dayMenu?.dinner?.guestVegTaken || 0) +
          (dayMenu?.dinner?.guestNonVegTaken || 0),
        dinnerGuestVegTaken: dayMenu?.dinner?.guestVegTaken || 0,
        dinnerGuestNonVegTaken: dayMenu?.dinner?.guestNonVegTaken || 0,
        dinnerFlatVegTaken: 0,
        dinnerFlatNonVegTaken: 0,
      };

      // 2. Aggregate data from unique flat records
      return uniqueSubscriptions.reduce((totals, item) => {
        const mealSlots = item.mealSlots?.[day] || [];
        const takenByPerson = item.takenByPerson?.[day] || [];

        mealSlots.forEach((slots, index) => {
          const taken = takenByPerson?.[index];
          let personCounted = false;

          // Breakfast logic
          if (
            isMealEnabled(day, "breakfast", dayConfig) &&
            slots?.breakfast &&
            slots.breakfast !== "None"
          ) {
            const diet = slots.breakfast === "Veg" ? "veg" : "nonVeg";
            if (isDietaryEnabled(day, "breakfast", diet, dayConfig)) {
              totals.breakfast += 1;
              if (slots.breakfast === "Veg") totals.breakfastVeg += 1;
              else if (slots.breakfast === "Non-veg")
                totals.breakfastNonVeg += 1;

              if (
                isParcelEnabled(day, "breakfast", dayConfig) &&
                slots.breakfastParcel
              ) {
                totals.breakfastParcel += 1;
                if (taken?.breakfast) totals.breakfastParcelTaken += 1;
              }
              if (taken?.breakfast) {
                totals.breakfastTaken += 1;
                if (slots.breakfast === "Veg")
                  totals.breakfastFlatVegTaken += 1;
                else if (slots.breakfast === "Non-veg")
                  totals.breakfastFlatNonVegTaken += 1;
              }
              personCounted = true;
            }
          }

          // Lunch logic
          if (
            isMealEnabled(day, "lunch", dayConfig) &&
            slots?.lunch &&
            slots.lunch !== "None"
          ) {
            const diet = slots.lunch === "Veg" ? "veg" : "nonVeg";
            if (isDietaryEnabled(day, "lunch", diet, dayConfig)) {
              totals.lunch += 1;
              if (slots.lunch === "Veg") totals.lunchVeg += 1;
              else if (slots.lunch === "Non-veg") totals.lunchNonVeg += 1;

              if (isParcelEnabled(day, "lunch", dayConfig) && slots.lunchParcel) {
                totals.lunchParcel += 1;
                if (taken?.lunch) totals.lunchParcelTaken += 1;
              }
              if (taken?.lunch) {
                totals.lunchTaken += 1;
                if (slots.lunch === "Veg") totals.lunchFlatVegTaken += 1;
                else if (slots.lunch === "Non-veg")
                  totals.lunchFlatNonVegTaken += 1;
              }
              personCounted = true;
            }
          }

          // Dinner logic
          if (
            isMealEnabled(day, "dinner", dayConfig) &&
            slots?.dinner &&
            slots.dinner !== "None"
          ) {
            const diet = slots.dinner === "Veg" ? "veg" : "nonVeg";
            if (isDietaryEnabled(day, "dinner", diet, dayConfig)) {
              totals.dinner += 1;
              if (slots.dinner === "Veg") totals.dinnerVeg += 1;
              else if (slots.dinner === "Non-veg") totals.dinnerNonVeg += 1;

              if (
                isParcelEnabled(day, "dinner", dayConfig) &&
                slots.dinnerParcel
              ) {
                totals.dinnerParcel += 1;
                if (taken?.dinner) totals.dinnerParcelTaken += 1;
              }
              if (taken?.dinner) {
                totals.dinnerTaken += 1;
                if (slots.dinner === "Veg") totals.dinnerFlatVegTaken += 1;
                else if (slots.dinner === "Non-veg")
                  totals.dinnerFlatNonVegTaken += 1;
              }
              personCounted = true;
            }
          }

          if (personCounted) {
            totals.people += 1;
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
    subscriptions.forEach((item) => {
      const amt = Number.parseFloat(item.amount) || 0;
      total += amt;
      if (item.paymentMode === "UPI") upi += amt;
      else if (item.paymentMode === "Cash") cash += amt;
    });
    return { total, upi, cash };
  }, [subscriptions]);

  // --- Rendering Conditional Views ---

  if (loading) {
    return (
      <ImageBackground
        source={{
          uri: "https://source.unsplash.com/featured/1200x1800/?durga,puja,festival",
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

  // Session Wall
  if (screen === "login" || !userRole)
    return (
      <>
        <LoginScreen onLogin={handleLogin} showAlert={showAlert} />
        <CustomAlert
          visible={alertConfig.visible}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          onClose={() => setAlertConfig((c) => ({ ...c, visible: false }))}
        />
      </>
    );

  // Form View (New/Edit)
  if (screen === "form" && editing)
    return (
      <>
        <SubscriptionForm
          value={editing}
          userRole={userRole}
          config={dayConfig}
          onCancel={() => setScreen(editing.flat ? "details" : "home")}
          onSave={updateSubscription}
          onSaveQr={
            editing.flat
              ? undefined
              : async (next) => {
                  if (await updateSubscription(next)) setScreen("qr");
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
          lockIdentity={Boolean(editing.flat)}
          showAlert={showAlert}
        />
        <CustomAlert
          visible={alertConfig.visible}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          onClose={() => setAlertConfig((c) => ({ ...c, visible: false }))}
        />
      </>
    );

  // Digital Food Pass
  if (screen === "qr")
    return (
      <>
        <QrScreen
          subscription={selected}
          onBack={() => setScreen("details")}
          onShare={shareQr}
          onPrint={printPass}
        />
        <CustomAlert
          visible={alertConfig.visible}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          onClose={() => setAlertConfig((c) => ({ ...c, visible: false }))}
        />
      </>
    );

  // Camera Scanner
  if (screen === "scanner")
    return (
      <>
        <ScannerScreen
          onBack={() => setScreen("home")}
          onScanned={openScannedValue}
        />
        <CustomAlert
          visible={alertConfig.visible}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          onClose={() => setAlertConfig((c) => ({ ...c, visible: false }))}
        />
      </>
    );

  // Operations Analytics
  if (screen === "dashboard")
    return (
      <>
        <DashboardScreen
          data={dashboard}
          userRole={userRole}
          totalCollection={collections.total}
          upiCollection={collections.upi}
          cashCollection={collections.cash}
          menu={foodMenu}
          config={dayConfig}
          onUpdateMenu={handleUpdateMenu}
          onBack={() => setScreen("home")}
          showAlert={showAlert}
        />
        <CustomAlert
          visible={alertConfig.visible}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          onClose={() => setAlertConfig((c) => ({ ...c, visible: false }))}
        />
      </>
    );

  // Menu Management Views
  if (screen === "viewMenu")
    return (
      <>
        <ViewMenuScreen
          menu={foodMenu}
          userRole={userRole}
          config={dayConfig}
          onEdit={() => setScreen("menu")}
          onBack={() => setScreen("home")}
          showAlert={showAlert}
        />
        <CustomAlert
          visible={alertConfig.visible}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          onClose={() => setAlertConfig((c) => ({ ...c, visible: false }))}
        />
      </>
    );

  if (screen === "menu")
    return (
      <>
        <MenuEditorScreen
          menu={foodMenu}
          config={dayConfig}
          onSave={handleUpdateMenu}
          onBack={() => setScreen("viewMenu")}
          showAlert={showAlert}
        />
        <CustomAlert
          visible={alertConfig.visible}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          onClose={() => setAlertConfig((c) => ({ ...c, visible: false }))}
        />
      </>
    );

  // Admin Reports
  if (screen === "report")
    return (
      <>
        <ReportScreen
          subscriptions={subscriptions}
          menu={foodMenu}
          config={dayConfig}
          onBack={() => setScreen("home")}
          onShare={shareQr}
          showAlert={showAlert}
        />
        <CustomAlert
          visible={alertConfig.visible}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          onClose={() => setAlertConfig((c) => ({ ...c, visible: false }))}
        />
      </>
    );

  // App Settings
  if (screen === "settings")
    return (
      <>
        <SettingsScreen
          config={dayConfig}
          onSave={handleUpdateConfig}
          onBack={() => setScreen("home")}
          showAlert={showAlert}
        />
        <CustomAlert
          visible={alertConfig.visible}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          onClose={() => setAlertConfig((c) => ({ ...c, visible: false }))}
        />
      </>
    );

  // Individual Flat Details
  if (screen === "details")
    return (
      <>
        <DetailsScreen
          subscription={selected}
          userRole={userRole}
          config={dayConfig}
          onBack={() => setScreen("home")}
          onEdit={() => {
            setEditing(selected);
            setScreen("form");
          }}
          onDelete={() => deleteSubscription(selected.id)}
          onQr={() => setScreen("qr")}
          menu={foodMenu}
          showAlert={showAlert}
        />
        <CustomAlert
          visible={alertConfig.visible}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          onClose={() => setAlertConfig((c) => ({ ...c, visible: false }))}
        />
      </>
    );

  // --- Home Screen (Default) ---

  return (
    <ImageBackground
      source={{
        uri: "https://source.unsplash.com/featured/1200x1800/?durga,puja,festival",
      }}
      style={styles.root}
      imageStyle={styles.backgroundImage}
    >
      <KeyboardAvoidingView
        style={styles.rootOverlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <StatusBar style="light" />
        <View style={styles.header}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={styles.eyebrow}>{UI_TEXT.eventTitle}</Text>
            <Pressable onPress={handleLogout} style={{ padding: 4 }}>
              <ActionLabel
                icon="log-out-outline"
                label={UI_TEXT.logoutButton}
                color="#f0c977"
              />
            </Pressable>
          </View>
          <Text style={styles.title}>{UI_TEXT.appName}</Text>
          <Text style={styles.subtitle}>{UI_TEXT.tagline}</Text>
        </View>

        <FlatList
          data={visibleSubscriptions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          ListHeaderComponent={
            <>
              {firebaseError ? (
                <View style={styles.firebaseBanner}>
                  <Text style={styles.firebaseBannerTitle}>
                    {UI_TEXT.offlineMode}
                  </Text>
                  <Text style={styles.firebaseBannerText}>{firebaseError}</Text>
                </View>
              ) : null}
              <View style={styles.summary}>
                <View>
                  <Text style={styles.summaryLabel}>{UI_TEXT.activePasses}</Text>
                  <Text style={styles.summaryNumber}>
                    {subscriptions.length}
                  </Text>
                </View>
              </View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{UI_TEXT.subscriptions}</Text>
                <View style={styles.compactActions}>
                  <Pressable
                    accessibilityLabel={UI_TEXT.viewMenu}
                    onPress={() => setScreen("viewMenu")}
                    style={styles.compactSecondary}
                  >
                    <ActionLabel
                      icon="restaurant-outline"
                      label={UI_TEXT.viewMenu}
                    />
                  </Pressable>
                  <Pressable
                    accessibilityLabel={UI_TEXT.dashboard}
                    onPress={() => setScreen("dashboard")}
                    style={styles.compactSecondary}
                  >
                    <ActionLabel
                      icon="stats-chart-outline"
                      label={UI_TEXT.dashboard}
                    />
                  </Pressable>
                  <Pressable
                    accessibilityLabel={UI_TEXT.report}
                    onPress={() => setScreen("report")}
                    style={styles.compactSecondary}
                  >
                    <ActionLabel
                      icon="document-text-outline"
                      label={UI_TEXT.report}
                    />
                  </Pressable>
                  <Pressable
                    accessibilityLabel={UI_TEXT.scanQr}
                    onPress={() => setScreen("scanner")}
                    style={styles.compactSecondary}
                  >
                    <ActionLabel icon="scan-outline" label={UI_TEXT.scanQr} />
                  </Pressable>
                  {userRole === "admin" && (
                    <Pressable
                      accessibilityLabel="Settings"
                      onPress={() => setScreen("settings")}
                      style={styles.compactSecondary}
                    >
                      <ActionLabel
                        icon="settings-outline"
                        label="Settings"
                      />
                    </Pressable>
                  )}
                  {userRole === "admin" && (
                    <Pressable
                      accessibilityLabel={UI_TEXT.addFlat}
                      onPress={startNew}
                      style={styles.addButton}
                    >
                      <ActionLabel
                        icon="add-circle-outline"
                        label={UI_TEXT.addFlat}
                        color="#fff"
                      />
                    </Pressable>
                  )}
                </View>
              </View>
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={19} color="#8d8171" />
                <TextInput
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholder={UI_TEXT.searchPlaceholder}
                  placeholderTextColor="#8d8171"
                  style={styles.searchInput}
                  autoCapitalize="characters"
                  clearButtonMode="while-editing"
                />
              </View>
              {visibleSubscriptions.length === 0 ? (
                <Text style={styles.emptyState}>
                  {subscriptions.length === 0
                    ? UI_TEXT.noRecords
                    : UI_TEXT.noMatches}
                </Text>
              ) : null}
            </>
          }
          ListFooterComponent={
            <View style={styles.footer} />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                setSelectedId(item.id);
                setSelectedRecord(item);
                setScreen("details");
              }}
              style={styles.card}
            >
              <View style={styles.cardTop}>
                <View>
                  <Text style={styles.flatLabel}>BLOCK {item.block}</Text>
                  <Text style={styles.flatTitle}>Flat {item.flat}</Text>
                </View>
                <View style={styles.pill}>
                  <Text style={styles.pillText}>{mealSummary(item, dayConfig) || UI_TEXT.flexibleMeals}</Text>
                </View>
              </View>
              <Text style={styles.people}>
                {item.peopleCount}
                {item.peopleCount === 1
                  ? UI_TEXT.personSuffix
                  : UI_TEXT.personsSuffix}
              </Text>
              <View style={styles.cardBottom}>
                <Text style={styles.daysText}>{item.paymentMode}</Text>
                <Text style={styles.amount}>
                  {UI_TEXT.rs} {item.amount || "0"}
                </Text>
              </View>
            </Pressable>
          )}
        />
      </KeyboardAvoidingView>
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig((c) => ({ ...c, visible: false }))}
      />
    </ImageBackground>
  );
}
