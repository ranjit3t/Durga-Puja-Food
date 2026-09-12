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
import AsyncStorage from "@react-native-async-storage/async-storage";
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

const SESSION_ROLE_KEY = "eternia_user_role";
const SESSION_TIME_KEY = "eternia_login_time";
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
  // --- Global State ---
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [screen, setScreen] = useState<Screen>("login");
  const [isBackNav, setIsBackNav] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<Subscription | null>(
    null
  );
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [dayConfig, setDayConfig] = useState<ConfigDay[]>([]);
  const [seasonName, setSeasonName] = useState("");
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
    const checkSession = async () => {
      try {
        const storedRole = await AsyncStorage.getItem(SESSION_ROLE_KEY);
        const storedTime = await AsyncStorage.getItem(SESSION_TIME_KEY);

        if (storedRole && storedTime) {
          const loginTime = parseInt(storedTime, 10);
          if (Date.now() - loginTime < SESSION_TIMEOUT) {
            setUserRole(storedRole as UserRole);
            setScreen("home");
          } else {
            // Session expired
            await AsyncStorage.multiRemove([SESSION_ROLE_KEY, SESSION_TIME_KEY]);
          }
        }
      } catch (err) {
        console.error("Session check error:", err);
      } finally {
        setLoading(false);
      }
    };
    void checkSession();
  }, []);

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
      setIsBackNav(false);
    }
  }, [screen, userRole]);

  // 2. Periodic Background Sync: Refresh data every 10 seconds when on the same screen
  // Also checks if session has expired (24h limit)
  useEffect(() => {
    if (!userRole || screen === "login") return;

    const interval = setInterval(async () => {
      // Check session expiration
      const storedTime = await AsyncStorage.getItem(SESSION_TIME_KEY);
      if (storedTime) {
        const loginTime = parseInt(storedTime, 10);
        if (Date.now() - loginTime >= SESSION_TIMEOUT) {
          handleLogout();
          return;
        }
      }

      void refreshAllData(true);
    }, 10000); // 10,000ms = 10 seconds

    return () => clearInterval(interval);
  }, [screen, userRole]);

  /**
   * Native hardware back button handling.
   * Ensures physical back button logic matches in-app navigation flow.
   */
  useEffect(() => {
    const handleBackPress = () => {
      if (screen === "login" || screen === "home") {
        return false; // Exit app
      }

      setIsBackNav(true);
      if (screen === "details") setScreen("home");
      else if (screen === "form")
        setScreen(editing?.flat ? "details" : "home");
      else if (screen === "qr") setScreen("details");
      else if (screen === "scanner") setScreen("home");
      else if (screen === "dashboard") setScreen("home");
      else if (screen === "viewMenu") setScreen("home");
      else if (screen === "menu") setScreen("viewMenu");
      else if (screen === "report") setScreen("home");
      else if (screen === "settings") setScreen("home");
      else setScreen("home");

      return true;
    };

    const subscription = BackHandler.addEventListener("hardwareBackPress", handleBackPress);
    return () => subscription.remove();
  }, [screen, editing]);

  /**
   * Handles user authentication and transitions to the Home screen.
   */
  const handleLogin = (role: UserRole) => {
    setLoading(true); // Trigger global loader while initial data fetch happens
    setUserRole(role);
    setScreen("home");
    // Persist session for 24 hours
    void AsyncStorage.setItem(SESSION_ROLE_KEY, role);
    void AsyncStorage.setItem(SESSION_TIME_KEY, Date.now().toString());
  };

  const handleLogout = () => {
    setUserRole(null);
    setScreen("login");
    setSubscriptions([]);
    setDayConfig([]);
    setFoodMenu({});
    // Clear session
    void AsyncStorage.multiRemove([SESSION_ROLE_KEY, SESSION_TIME_KEY]);
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
    setScreen("form");
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
      setScreen("details");
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
      setScreen("home");
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
    if (!(await Sharing.isAvailableAsync())) {
      showAlert("Error", "Sharing is not available on this device");
      return;
    }

    try {
      // For WhatsApp and other apps, sharing the message + image
      // works differently across OS versions.
      await Sharing.shareAsync(uri, {
        dialogTitle: message || UI_TEXT.shareQrDialog,
        mimeType: 'image/png',
        UTI: 'public.png',
      });

      // If a message is provided, also try to put it in clipboard or share text
      // as a separate action if needed, but for now the Digital Pass solves it.
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
      setScreen("details");
    } else {
      showAlert(UI_TEXT.error, UI_TEXT.scanError);
      setScreen("home");
    }
  };

  /**
   * Search filter logic for the Home screen list.
   */
  const visibleSubscriptions = useMemo(() => {
    if (!searchText) return subscriptions;
    return subscriptions.filter(
      (s) =>
        s.flat.toLowerCase().includes(searchText.toLowerCase()) ||
        s.block.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [subscriptions, searchText]);

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

        lunch: (dayMenu?.lunch?.guestVeg || 0) + (dayMenu?.lunch?.guestNonVeg || 0),
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
          (dayMenu?.dinner?.guestVeg || 0) + (dayMenu?.dinner?.guestNonVeg || 0),
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
    subscriptions.forEach((item) => {
      const amt = Number.parseFloat(item.amount) || 0;
      total += amt;
      if (item.paymentMode === "UPI") upi += amt;
      else if (item.paymentMode === "Cash") cash += amt;
    });
    return { total, upi, cash };
  }, [subscriptions]);

  const selected = subscriptions.find((s) => s.id === selectedId) || selectedRecord;

  // --- Screen Selector ---

  const renderContent = () => {
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

    if (screen === "login" || !userRole) {
      return <LoginScreen onLogin={handleLogin} showAlert={showAlert} repository={repository} />;
    }

    if (screen === "form" && editing) {
      return (
        <SubscriptionForm
          value={editing}
          userRole={userRole}
          config={dayConfig}
          onCancel={() => {
            setIsBackNav(true);
            setScreen(editing.flat ? "details" : "home");
          }}
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
          onBack={() => {
            setIsBackNav(true);
            setScreen("details");
          }}
          onShare={shareQr}
          onPrint={printPass}
          onLogout={handleLogout}
        />
      );
    }

    if (screen === "scanner") {
      return (
        <ScannerScreen
          onBack={() => {
            setIsBackNav(true);
            setScreen("home");
          }}
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
          menu={foodMenu}
          config={dayConfig}
          onUpdateMenu={handleUpdateMenu}
          onBack={() => {
            setIsBackNav(true);
            setScreen("home");
          }}
          onLogout={handleLogout}
          showAlert={showAlert}
        />
      );
    }

    if (screen === "viewMenu") {
      return (
        <ViewMenuScreen
          menu={foodMenu}
          userRole={userRole}
          config={dayConfig}
          onEdit={() => setScreen("menu")}
          onBack={() => {
            setIsBackNav(true);
            setScreen("home");
          }}
          onLogout={handleLogout}
          showAlert={showAlert}
        />
      );
    }

    if (screen === "menu") {
      return (
        <MenuEditorScreen
          menu={foodMenu}
          config={dayConfig}
          onSave={handleUpdateMenu}
          onBack={() => {
            setIsBackNav(true);
            setScreen("viewMenu");
          }}
          onLogout={handleLogout}
          showAlert={showAlert}
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
          onBack={() => {
            setIsBackNav(true);
            setScreen("home");
          }}
          onShare={shareQr}
          onLogout={handleLogout}
        />
      );
    }

    if (screen === "settings") {
      return (
        <SettingsScreen
          config={dayConfig}
          seasonName={seasonName}
          onSave={handleUpdateConfig}
          onBack={() => {
            setIsBackNav(true);
            setScreen("home");
          }}
          onLogout={handleLogout}
          showAlert={showAlert}
        />
      );
    }

    if (screen === "details" && selected) {
      return (
        <DetailsScreen
          subscription={selected}
          userRole={userRole}
          config={dayConfig}
          onBack={() => {
            setIsBackNav(true);
            setScreen("home");
          }}
          onEdit={() => {
            setEditing(selected);
            setScreen("form");
          }}
          onDelete={() => deleteSubscription(selected.id)}
          onQr={() => setScreen("qr")}
          onLogout={handleLogout}
          menu={foodMenu}
          showAlert={showAlert}
        />
      );
    }

    // Default: Home Screen
    return (
      <View style={styles.root}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <StatusBar style="dark" />
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
                  color="#E31837"
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
                  <Ionicons name="ticket-outline" size={64} color="rgba(255,255,255,0.3)" />
                </View>

              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={22} color="#6A6E73" />
                <TextInput
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholder={UI_TEXT.searchPlaceholder}
                  placeholderTextColor="#ADB5BD"
                  style={styles.searchInput}
                  autoCapitalize="characters"
                  clearButtonMode="while-editing"
                />
              </View>

              <View style={{ marginBottom: 32 }}>
                <View style={[styles.sectionHeader, { marginBottom: 16 }]}>
                  <Text style={styles.sectionTitle}>{UI_TEXT.subscriptions}</Text>
                </View>
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
                </View>
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
            <View style={styles.footer}>
               <Text style={styles.footerText}>{UI_TEXT.footerCopyright}</Text>
            </View>
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
                  <View style={{ flex: 1 }}>
                    <Text style={styles.flatLabel}>BLOCK {item.block}</Text>
                    <Text style={styles.flatTitle}>Flat {item.flat}</Text>
                    <Text style={{ color: "#6A6E73", marginTop: 4, fontWeight: "600" }}>
                      {item.peopleCount} {item.peopleCount === 1 ? UI_TEXT.personSuffix : UI_TEXT.personsSuffix}
                    </Text>
                  </View>
                  <View style={styles.pill}>
                    <Text style={styles.pillText}>{mealSummary(item, dayConfig) || UI_TEXT.flexibleMeals}</Text>
                  </View>
                </View>

                <View style={{ height: 1, backgroundColor: "#E9ECEF", marginVertical: 16 }} />

                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="card-outline" size={16} color="#E31837" />
                    <Text style={{ fontWeight: "700", color: "#1A1C1E" }}>{item.paymentMode}</Text>
                  </View>
                  <Text style={{ fontSize: 18, fontWeight: "900", color: "#E31837" }}>
                    {UI_TEXT.rs} {item.amount || "0"}
                  </Text>
                </View>
              </Pressable>
            )}
          />
        </KeyboardAvoidingView>

        {userRole === "admin" && (
          <Pressable
            style={[styles.fab, getActiveDays(dayConfig).length === 0 && { opacity: 0.4 }]}
            onPress={startNew}
            disabled={getActiveDays(dayConfig).length === 0}
          >
            <Ionicons name="add" size={32} color="#FFF" />
          </Pressable>
        )}
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
