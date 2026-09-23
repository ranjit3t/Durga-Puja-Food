import React, { useState, useRef, memo } from "react";
import { View, Text, Pressable, StatusBar, StyleSheet, useWindowDimensions, Platform, TextInput } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useStyles } from "../styles";
import { useAppTheme } from "../theme";
import { UI_TEXT } from "../strings";
import { BackButton } from "../components/common/BackButton";
import { QuickCheckoutModal } from "../components/common/QuickCheckoutModal";

import { useAppNavigation } from "../context/NavigationContext";
import { useDatabase } from "../context/DatabaseContext";
import { useUI } from "../context/UIContext";
import { AppScreen, AppThemeMode, ActivityModule, ActivityAction, Subscription, MealType, DietaryOption } from "../types";
import { getActiveDays, isMealCurrent, isMealEnabled, getDayLabel, getMealLabel, qrValueFor, isParcelEnabled } from "../constants";

// Memoized Camera View to prevent UI/WebSocket re-renders from dropping camera FPS
const MemoizedCamera = memo(({ onScan }: { onScan: (data: string) => void }) => {
  return (
    <CameraView
      key="camera-view"
      style={StyleSheet.absoluteFill}
      facing="back"
      barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      onBarcodeScanned={async ({ data }) => onScan(data)}
    />
  );
}, () => true); // Never re-render camera view unless unmounted

export function ScannerScreen() {
  const styles = useStyles();
  const { theme, themeType } = useAppTheme();
  const { width } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();

  const { openScannedValue, goBack, navigate, isQuickCheckout } = useAppNavigation();
  const { subscriptions, dayConfig, kidsEnabled, addActivityLog } = useDatabase();
  const { showAlert } = useUI();

  const scanSize = Math.min(width * 0.85, 320);
  const [error, setError] = useState("");
  const [passCode, setPassCode] = useState("");
  const isScanning = useRef(false);

  // Quick Checkout State
  const [selectedPass, setSelectedPass] = useState<Subscription | null>(null);
  const [currentMealInfo, setCurrentMealInfo] = useState<{ dayId: string; mealType: MealType; dayLabel: string; mealLabel: string } | null>(null);

  const processCodeOrData = (dataOrCode: string, isPassCode: boolean) => {
    if (isScanning.current) return;
    isScanning.current = true;

    if (!isQuickCheckout) {
      const found = openScannedValue(dataOrCode, subscriptions);
      if (found) {
        addActivityLog({
          module: ActivityModule.SCANNER,
          action: isPassCode ? ActivityAction.PASS : ActivityAction.SCAN,
          targetId: dataOrCode.split('/').pop(),
          description: isPassCode
            ? UI_TEXT.logPassSuccess.replace("{id}", dataOrCode) + " (Pass Code)"
            : UI_TEXT.logScanSuccess.replace("{id}", dataOrCode.split('/').pop() || "")
        });
      } else {
        addActivityLog({
          module: ActivityModule.SCANNER,
          action: isPassCode ? ActivityAction.PASS : ActivityAction.SCAN,
          description: isPassCode ? "Invalid Pass Code: " + dataOrCode : UI_TEXT.logScanFail.replace("{data}", dataOrCode)
        });
        setError(isPassCode ? UI_TEXT.passCodeError : UI_TEXT.scanError);
        showAlert(UI_TEXT.error, isPassCode ? UI_TEXT.passCodeError : UI_TEXT.scanError, [
          {
            text: UI_TEXT.ok,
            onPress: () => {
              if (isPassCode) {
                setPassCode("");
                setError("");
                isScanning.current = false;
              } else {
                navigate(AppScreen.SUBSCRIPTION_LIST);
              }
            },
          },
        ]);
      }
      return;
    }

    // Quick Checkout Mode Validation
    const match = subscriptions.find((s) =>
      qrValueFor(s.id) === dataOrCode || s.id === dataOrCode || s.passcode === dataOrCode
    );

    if (!match) {
      addActivityLog({
        module: ActivityModule.SCANNER,
        action: isPassCode ? ActivityAction.PASS : ActivityAction.SCAN,
        description: UI_TEXT.logQuickCheckoutFailed.replace("{data}", dataOrCode)
      });
      setError(isPassCode ? UI_TEXT.passCodeError : UI_TEXT.scanError);
      showAlert(UI_TEXT.error, isPassCode ? UI_TEXT.passCodeError : UI_TEXT.scanError, [
        {
          text: UI_TEXT.ok,
          onPress: () => {
            setPassCode("");
            setError("");
            isScanning.current = false;
          },
        },
      ]);
      return;
    }

    // Match found - check current meal
    const activeDays = getActiveDays(dayConfig);
    let currentMeal: { dayId: string; mealType: MealType; dayLabel: string; mealLabel: string } | null = null;
    for (const dId of activeDays) {
      for (const mType of [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER]) {
        if (isMealCurrent(dId, mType, dayConfig) && isMealEnabled(dId, mType, dayConfig)) {
          currentMeal = {
            dayId: dId,
            mealType: mType,
            dayLabel: getDayLabel(dId, dayConfig),
            mealLabel: getMealLabel(mType)
          };
          break;
        }
      }
      if (currentMeal) break;
    }

    if (!currentMeal) {
      openScannedValue(dataOrCode, subscriptions);
      return;
    }

    const { dayId, mealType } = currentMeal;
    const mealKey = mealType;
    const parcelKey = `${mealType}Parcel`;

    const peopleCount = match.peopleCount;
    const kidsCount = kidsEnabled ? (match.kidsCount || 0) : 0;
    const headcount = peopleCount + kidsCount;

    const slots = match.mealSlots?.[dayId] || [];
    const taken = match.takenByPerson?.[dayId] || [];

    const parcelSupported = isParcelEnabled(dayId, mealType, dayConfig);

    let adultsPlanned = 0;
    let adultsTaken = 0;
    let kidsPlanned = 0;
    let kidsTaken = 0;
    let parcelPlanned = 0;
    let parcelTaken = 0;

    for (let i = 0; i < headcount; i++) {
      const isKid = kidsEnabled && i >= peopleCount;
      const isSubscribed = slots[i]?.[mealKey] && slots[i][mealKey] !== DietaryOption.NONE;
      const isMealTaken = !!taken[i]?.[mealKey];

      if (isSubscribed) {
        if (!isKid) {
          adultsPlanned++;
          if (isMealTaken) adultsTaken++;
        } else {
          kidsPlanned++;
          if (isMealTaken) kidsTaken++;
        }
      }

      if (parcelSupported && slots[i]?.[parcelKey as keyof typeof slots[0]]) {
        parcelPlanned++;
        if (taken[i]?.[parcelKey as keyof typeof taken[0]]) {
          parcelTaken++;
        }
      }
    }

    const subscribedCount = adultsPlanned + kidsPlanned + parcelPlanned;

    const adultsMax = Math.max(0, adultsPlanned - adultsTaken);
    const kidsMax = Math.max(0, kidsPlanned - kidsTaken);

    // Modal is shown ONLY when any person of the pass for current day has NOT taken food
    const unservedFoodCount = adultsMax + kidsMax;

    if (subscribedCount === 0) {
      addActivityLog({
        module: ActivityModule.SCANNER,
        action: isPassCode ? ActivityAction.PASS : ActivityAction.SCAN,
        targetId: match.id,
        description: `${UI_TEXT.quickCheckout}${UI_TEXT.colon}${UI_TEXT.space}${UI_TEXT.quickCheckoutNoSubscription}`
      });
      showAlert(UI_TEXT.error, UI_TEXT.quickCheckoutNoSubscription, [
        {
          text: UI_TEXT.ok,
          onPress: () => {
            setPassCode("");
            setError("");
            isScanning.current = false;
          },
        },
      ]);
      return;
    }

    if (unservedFoodCount === 0) {
      addActivityLog({
        module: ActivityModule.SCANNER,
        action: isPassCode ? ActivityAction.PASS : ActivityAction.SCAN,
        targetId: match.id,
        description: `${UI_TEXT.quickCheckout}${UI_TEXT.colon}${UI_TEXT.space}${UI_TEXT.quickCheckoutAllServed}`
      });
      showAlert(UI_TEXT.error, UI_TEXT.quickCheckoutAllServed, [
        {
          text: UI_TEXT.ok,
          onPress: () => {
            setPassCode("");
            setError("");
            isScanning.current = false;
          },
        },
      ]);
      return;
    }

    // Unserved members exist -> Open Quick Checkout Modal
    addActivityLog({
      module: ActivityModule.SCANNER,
      action: isPassCode ? ActivityAction.PASS : ActivityAction.SCAN,
      targetId: match.id,
      description: UI_TEXT.logQuickCheckoutOpened.replace("{id}", match.id)
    });

    setSelectedPass(match);
    setCurrentMealInfo(currentMeal);
  };

  const handleScan = (data: string) => {
    processCodeOrData(data, false);
  };

  const handlePassCode = (code: string) => {
    setPassCode(code);
    if (code.length === 4) {
      processCodeOrData(code, true);
    }
  };

  const handleCancelQuickCheckout = () => {
    setSelectedPass(null);
    setCurrentMealInfo(null);
    setPassCode("");
    setError("");
    isScanning.current = false;
  };

  const handleCheckoutSuccess = () => {
    setSelectedPass(null);
    setCurrentMealInfo(null);
    setPassCode("");
    setError("");
    isScanning.current = false;
  };

  if (!permission) return <View style={styles.root} />;
  if (!permission.granted) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle={themeType === AppThemeMode.DARK ? "light-content" : "dark-content"} />
        <View style={styles.header}>
          <BackButton onPress={goBack} />
          <Text style={styles.title}>{UI_TEXT.cameraAccess}</Text>
          <Text style={styles.subtitle}>{UI_TEXT.cameraAccessSubtitle}</Text>
        </View>
        <View style={styles.content}>
          <Pressable onPress={requestPermission} style={styles.primary}>
            <Text style={styles.primaryText}>{UI_TEXT.allowCamera}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.shadow }}>
      <StatusBar barStyle={themeType === AppThemeMode.DARK ? "light-content" : "dark-content"} />

      {/* 1. Camera fills the screen (Isolated in memoized component) */}
      <MemoizedCamera onScan={handleScan} />

      {/* 2. UI Overlay on top of camera */}
      <View style={[StyleSheet.absoluteFill, { pointerEvents: "box-none" }]}>

        {/* Back Button Area */}
        <View
          style={{
            paddingTop: 60,
            paddingHorizontal: 20,
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 999,
            pointerEvents: "box-none",
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <BackButton onPress={goBack} />
          <View style={{ flex: 1, alignItems: 'center', marginLeft: -40 }}>
            <TextInput
              value={passCode}
              onChangeText={handlePassCode}
              placeholder="XXXX"
              placeholderTextColor={theme.colors.white + "88"}
              keyboardType="number-pad"
              maxLength={4}
              style={{
                backgroundColor: theme.colors.shadow + "AA",
                color: theme.colors.white,
                fontSize: 24,
                fontWeight: "900",
                textAlign: "center",
                width: 120,
                height: 50,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: theme.colors.secondary,
              }}
            />
            <Text style={{ color: theme.colors.white, fontSize: 10, marginTop: 4, fontWeight: '700' }}>
              {UI_TEXT.passCodeEntryHint}
            </Text>
          </View>
        </View>

        {/* Center Target Box */}
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <View
            style={{
              width: scanSize,
              height: scanSize,
              borderWidth: 2,
              borderColor: theme.colors.secondary,
              borderRadius: 30
            }}
          />
        </View>

        {/* Bottom Hint Text */}
        <View
          style={{
            position: 'absolute',
            bottom: 80,
            left: 0,
            right: 0,
            alignItems: "center",
            pointerEvents: "none",
          }}
        >
          <Text
            style={{
              color: theme.colors.white,
              fontSize: 16,
              fontWeight: "700",
              ...Platform.select({
                ios: {
                  textShadowColor: theme.colors.shadow + "CC",
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 4
                },
                android: {
                  textShadowColor: theme.colors.shadow + "CC",
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 4
                },
                web: {
                  textShadow: `0 1px 4px ${theme.colors.shadow}CC`,
                }
              })
            }}
          >
            {UI_TEXT.scanFrameHint}
          </Text>
          {error ? (
            <Text style={{ color: theme.colors.error, fontWeight: "700", marginTop: 10 }}>
              {error}
            </Text>
          ) : null}
        </View>

      </View>

      {/* Quick Checkout Modal */}
      <QuickCheckoutModal
        visible={!!selectedPass}
        subscription={selectedPass}
        currentMealInfo={currentMealInfo}
        onClose={handleCancelQuickCheckout}
        onSuccess={handleCheckoutSuccess}
      />
    </View>
  );
}
