/**
 * Activity Log Screen for Admins.
 * Displays a historical list of system operations with filtering, search, and activity log analysis.
 * Connects directly to live WebSocket-streamed logs in DatabaseContext.
 */
import React, { useState, useMemo, useCallback, memo } from "react";
import {
  View,
  Text,
  Pressable,
  StatusBar,
  ActivityIndicator,
  FlatList,
  TextInput,
  Share,
  Platform,
  Switch,
  Modal,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles, useScaling } from "../styles";
import { useAppTheme } from "../theme";
import { UI_TEXT } from "../strings";
import { ActivityLog, ActivityModule, ActivityAction, AppThemeMode, AppScreen, CheckoutSource, GuestCheckoutSource } from "../domain";
import { BackButton } from "../components/common/BackButton";
import { HomeButton } from "../components/common/HomeButton";
import { LogoutButton } from "../components/common/LogoutButton";
import { ThemeToggleButton } from "../components/common/ThemeToggleButton";
import { Dropdown } from "../components/common/Dropdown";

import { useAuth } from "../context/AuthContext";
import { useCoreDatabase, useActivityLogs } from "../context/DatabaseContext";
import { useUI } from "../context/UIContext";
import { useAppNavigation } from "../context/NavigationContext";
import { Subscription } from "../types";

/**
 * Memoized individual log item for performance optimization.
 */
const ActivityLogItem = memo(({
  item,
  index,
  theme,
  styles,
  s,
  subscriptions,
  onNavigateToDetails,
  expanded,
  onToggleStack
}: {
  item: ActivityLog;
  index: number;
  theme: any;
  styles: any;
  s: (n: number) => number;
  subscriptions: Subscription[];
  onNavigateToDetails: (id: string) => void;
  expanded: boolean;
  onToggleStack: (id: string) => void;
}) => {
  const isError = item.action === ActivityAction.ERROR;
  const colorScheme = theme.cardColors[index % theme.cardColors.length];

  const clickableModules = [ActivityModule.SUBSCRIPTION, ActivityModule.CONTACT, ActivityModule.QR, ActivityModule.REPORT];
  const isPassEvent = clickableModules.includes(item.module) && item.action !== ActivityAction.DELETE && item.action !== ActivityAction.ERROR;
  const existingPass = isPassEvent && item.targetId ? (subscriptions || []).find(s => s.id === item.targetId) : null;
  const isClickable = !!existingPass;

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const checkoutSource = useMemo(() => {
    if (!item.description) return null;
    const desc = item.description;
    if (desc.includes(`via ${CheckoutSource.SCANNER}`) || desc.includes(`via QR Scanner`) || desc.includes(`via Scanner`)) {
      return { label: CheckoutSource.SCANNER, icon: "qr-code-outline" };
    }
    if (desc.includes(`via ${CheckoutSource.DETAILS}`) || desc.includes(`via Pass Details`) || desc.includes(`via Details`)) {
      return { label: CheckoutSource.DETAILS, icon: "card-outline" };
    }
    if (desc.includes(`via ${CheckoutSource.SUBSCRIPTION_LIST}`) || desc.includes(`via Pass Directory`)) {
      return { label: CheckoutSource.SUBSCRIPTION_LIST, icon: "list-outline" };
    }
    return null;
  }, [item.description]);

  const guestSource = useMemo(() => {
    if (!item.description || item.module !== ActivityModule.GUEST) return null;
    const desc = item.description;
    if (desc.includes(`via ${GuestCheckoutSource.GUEST_MODAL}`) || desc.includes(`via Quick Guest Modal`)) {
      return { label: GuestCheckoutSource.GUEST_MODAL, icon: "people-circle-outline" };
    }
    if (desc.includes(`via ${GuestCheckoutSource.GUEST_SCREEN}`) || desc.includes(`via Guest Desk Screen`)) {
      return { label: GuestCheckoutSource.GUEST_SCREEN, icon: "desktop-outline" };
    }
    return null;
  }, [item.description, item.module]);

  return (
    <Pressable
      onPress={() => item.targetId && onNavigateToDetails(item.targetId)}
      disabled={!isClickable}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: isError ? theme.colors.error + "10" : colorScheme.bg,
          borderColor: isError ? theme.colors.error : colorScheme.border,
          marginBottom: s(12),
          padding: s(16),
          borderLeftWidth: isError ? 6 : (isClickable ? 4 : 1.5),
          borderLeftColor: isClickable ? theme.colors.primary : (isError ? theme.colors.error : colorScheme.border),
        },
        isClickable && pressed && { opacity: 0.7, backgroundColor: theme.colors.surfaceDark }
      ]}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(8), marginBottom: s(8), flexWrap: 'wrap' }}>
            <View style={{ backgroundColor: isError ? theme.colors.error + "20" : theme.colors.primary + "15", paddingHorizontal: s(10), paddingVertical: s(4), borderRadius: s(8) }}>
              <Text style={{ fontSize: s(12), fontWeight: '900', color: isError ? theme.colors.error : theme.colors.primary }}>
                {item.userName}{item.userRole ? ` (${String(item.userRole).toUpperCase()})` : ""}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(4) }}>
              <Ionicons name="time-outline" size={s(12)} color={theme.colors.textMuted} />
              <Text style={{ fontSize: s(11), color: theme.colors.textMuted, fontWeight: '700' }}>{formatTimestamp(item.timestamp)}</Text>
            </View>
            {item.appVersion && (
              <View style={{ backgroundColor: theme.colors.surfaceDark, paddingHorizontal: s(6), paddingVertical: s(2), borderRadius: s(4), borderWidth: 1, borderColor: theme.colors.border }}>
                <Text style={{ fontSize: s(9), fontWeight: '800', color: theme.colors.textMuted }}>v{item.appVersion}</Text>
              </View>
            )}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(8), marginBottom: s(12), flexWrap: 'wrap' }}>
             <View style={{ backgroundColor: isError ? theme.colors.error + "10" : colorScheme.bg, paddingHorizontal: s(10), paddingVertical: s(4), borderRadius: s(8), borderWidth: 1, borderColor: isError ? theme.colors.error : colorScheme.border }}>
                <Text style={{ fontSize: s(11), fontWeight: '900', color: isError ? theme.colors.error : colorScheme.accent }}>{item.module.toUpperCase()}</Text>
             </View>
             <Ionicons name="chevron-forward" size={s(14)} color={theme.colors.border} />
             <Text style={{ fontSize: s(15), fontWeight: '800', color: isError ? theme.colors.error : theme.colors.textPrimary }}>{item.action}</Text>
             {item.targetId && (
               <View style={{ backgroundColor: theme.colors.surfaceDark, paddingHorizontal: s(8), paddingVertical: s(4), borderRadius: s(6), borderWidth: 1, borderColor: theme.colors.border }}>
                 <Text style={{ fontSize: s(11), fontWeight: '900', color: theme.colors.secondary }}>{item.targetId}</Text>
               </View>
             )}
             {checkoutSource && (
               <View style={{ backgroundColor: theme.colors.primary + "18", paddingHorizontal: s(8), paddingVertical: s(4), borderRadius: s(6), borderWidth: 1, borderColor: theme.colors.primary + "40", flexDirection: 'row', alignItems: 'center', gap: s(4) }}>
                 <Ionicons name={checkoutSource.icon as any} size={s(12)} color={theme.colors.primary} />
                 <Text style={{ fontSize: s(10), fontWeight: '900', color: theme.colors.primary, textTransform: 'uppercase' }}>{checkoutSource.label}</Text>
               </View>
             )}
             {guestSource && (
               <View style={{ backgroundColor: theme.cardColors[2].accent + "18", paddingHorizontal: s(8), paddingVertical: s(4), borderRadius: s(6), borderWidth: 1, borderColor: theme.cardColors[2].accent + "40", flexDirection: 'row', alignItems: 'center', gap: s(4) }}>
                 <Ionicons name={guestSource.icon as any} size={s(12)} color={theme.cardColors[2].accent} />
                 <Text style={{ fontSize: s(10), fontWeight: '900', color: theme.cardColors[2].accent, textTransform: 'uppercase' }}>{guestSource.label}</Text>
               </View>
             )}
             {isClickable && (
               <Ionicons name="open-outline" size={s(14)} color={theme.colors.primary} />
             )}
          </View>

          <View style={{ backgroundColor: theme.colors.surfaceDark, padding: s(12), borderRadius: s(12), marginBottom: s(12) }}>
            <Text style={{ fontSize: s(14), color: isError ? theme.colors.error : theme.colors.textPrimary, lineHeight: s(20), fontWeight: '600' }}>{item.description}</Text>
          </View>

          {isError && item.stack && (
            <View style={{ marginBottom: s(12) }}>
              <Pressable
                onPress={() => onToggleStack(item.id)}
                style={({ pressed }) => [
                  { flexDirection: 'row', alignItems: 'center', gap: s(6), backgroundColor: theme.colors.error + "15", paddingHorizontal: s(10), paddingVertical: s(6), borderRadius: s(8), alignSelf: 'flex-start' },
                  pressed && { opacity: 0.7 }
                ]}
              >
                <Ionicons name={expanded ? "eye-off-outline" : "eye-outline"} size={s(14)} color={theme.colors.error} />
                <Text style={{ fontSize: s(11), fontWeight: '900', color: theme.colors.error }}>{expanded ? UI_TEXT.hideStackTrace.toUpperCase() : UI_TEXT.viewStackTrace.toUpperCase()}</Text>
              </Pressable>
              {expanded && (
                <View style={{ backgroundColor: theme.colors.shadow + "10", padding: s(14), borderRadius: s(10), marginTop: s(8), borderWidth: 1, borderColor: theme.colors.error + "22" }}>
                  <Text style={{ fontSize: s(11), color: theme.colors.error, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', lineHeight: s(16) }}>{item.stack}</Text>
                </View>
              )}
            </View>
          )}

          {item.os && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(6), opacity: 0.6 }}>
              <Ionicons name={item.os.toLowerCase() === 'ios' ? 'logo-apple' : item.os.toLowerCase() === 'android' ? 'logo-android' : 'globe-outline'} size={s(14)} color={theme.colors.textMuted} />
              <Text style={{ fontSize: s(11), color: theme.colors.textMuted, fontWeight: '800', textTransform: 'uppercase' }}>{item.os} {item.device}</Text>
            </View>
          )}
        </View>

        <View style={{ backgroundColor: isError ? theme.colors.error + "10" : theme.colors.surfaceDark, padding: s(10), borderRadius: s(14), borderWidth: 1, borderColor: isError ? theme.colors.error + "20" : theme.colors.border }}>
          <Ionicons
            name={
              item.action === ActivityAction.CREATE ? "add-circle-outline" :
              item.action === ActivityAction.DELETE ? "trash-outline" :
              item.action === ActivityAction.SCAN ? "qr-code-outline" :
              item.action === ActivityAction.CHAT ? "logo-whatsapp" :
              item.action === ActivityAction.CALL ? "call-outline" :
              item.action === ActivityAction.LOGIN ? "log-in-outline" :
              item.action === ActivityAction.LOGOUT ? "log-out-outline" :
              item.action === ActivityAction.ERROR ? "alert-circle-outline" :
              item.action === ActivityAction.MISSED_PARCEL ? "cube-outline" :
              item.action === ActivityAction.SMS ? "mail-outline" :
              "pencil-outline"
            }
            size={s(22)}
            color={
              item.action === ActivityAction.DELETE || item.action === ActivityAction.ERROR ? theme.colors.error :
              item.action === ActivityAction.CREATE ? theme.colors.success :
              theme.colors.primary
            }
          />
        </View>
      </View>
    </Pressable>
  );
});

export function ActivityLogScreen() {
  const { handleLogout } = useAuth();
  const { loading, refreshAllData, subscriptions } = useCoreDatabase();
  const { activityLogs, fetchMoreLogs } = useActivityLogs();
  const { navigate, goBack, setSelectedId, setSelectedRecord } = useAppNavigation();
  const { showAlert } = useUI();
  const { width } = useWindowDimensions();

  const styles = useStyles();
  const { s } = useScaling();
  const { theme, themeType } = useAppTheme();

  const [refreshing, setRefreshing] = useState(false);
  const [dbLimit, setDbLimit] = useState(50);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [expandedStacks, setExpandedStacks] = useState<Record<string, boolean>>({});

  // Summary Modal State
  const [summaryModalVisible, setModalVisible] = useState(false);
  const [summaryText, setSummaryText] = useState("");

  // Filters & Search
  const [selectedUser, setSelectedUser] = useState(UI_TEXT.all);
  const [selectedModule, setSelectedModule] = useState(UI_TEXT.all);
  const [selectedTarget, setSelectedTarget] = useState(UI_TEXT.all);
  const [selectedDate, setSelectedDate] = useState(UI_TEXT.all);
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [isAscending, setIsAscending] = useState(false);

  // Automatically fetch a larger log set from DB when search query or filters are active
  React.useEffect(() => {
    const isSearchingOrFiltering =
      !!searchText ||
      selectedUser !== UI_TEXT.all ||
      selectedModule !== UI_TEXT.all ||
      selectedTarget !== UI_TEXT.all ||
      selectedDate !== UI_TEXT.all ||
      errorsOnly;

    if (isSearchingOrFiltering && dbLimit < 250) {
      setDbLimit(250);
      fetchMoreLogs(250);
    }
  }, [searchText, selectedUser, selectedModule, selectedTarget, selectedDate, errorsOnly, dbLimit, fetchMoreLogs]);

  const logs = activityLogs || [];

  const userOptions = useMemo(() => {
    const users = new Set<string>();
    users.add(UI_TEXT.all);
    logs.forEach(log => {
      if (log.userName) {
        users.add(log.userName);
        if (log.userRole) {
          users.add(`${log.userName} (${log.userRole})`);
          users.add(String(log.userRole));
        }
      }
    });
    return Array.from(users).sort();
  }, [logs]);

  const dateOptions = useMemo(() => {
    const dates = new Set<string>();
    dates.add(UI_TEXT.all);
    logs.forEach(log => {
      const d = new Date(log.timestamp).toLocaleDateString();
      dates.add(d);
    });
    return Array.from(dates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [logs]);

  const moduleOptions = useMemo(() => {
    const modules = new Set<string>();
    modules.add(UI_TEXT.all);
    Object.values(ActivityModule).forEach(m => modules.add(m));
    return Array.from(modules).sort();
  }, []);

  const targetOptions = useMemo(() => {
    const targets = new Set<string>();
    targets.add(UI_TEXT.all);
    logs.forEach(log => {
      if (log.targetId) targets.add(log.targetId);
    });
    return Array.from(targets).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    let result = logs.filter(log => {
      if (selectedUser !== UI_TEXT.all) {
        const formattedUser = log.userRole ? `${log.userName} (${log.userRole})` : log.userName;
        if (selectedUser !== log.userName && selectedUser !== log.userRole && selectedUser !== formattedUser) {
          return false;
        }
      }
      if (selectedModule !== UI_TEXT.all && log.module !== selectedModule) return false;
      if (selectedTarget !== UI_TEXT.all && log.targetId !== selectedTarget) return false;
      if (selectedDate !== UI_TEXT.all && new Date(log.timestamp).toLocaleDateString() !== selectedDate) return false;
      if (errorsOnly && log.action !== ActivityAction.ERROR) return false;
      if (searchText) {
        const query = searchText.toLowerCase();
        const matchDesc = log.description?.toLowerCase().includes(query);
        const matchUser = log.userName?.toLowerCase().includes(query);
        const matchRole = String(log.userRole || "").toLowerCase().includes(query);
        const matchTarget = log.targetId?.toLowerCase().includes(query);
        const matchModule = log.module?.toLowerCase().includes(query);
        const matchAction = log.action?.toLowerCase().includes(query);

        if (!matchDesc && !matchUser && !matchRole && !matchTarget && !matchModule && !matchAction) {
          return false;
        }
      }
      return true;
    });

    if (isAscending) {
      result = [...result].sort((a, b) => a.timestamp - b.timestamp);
    } else {
      result = [...result].sort((a, b) => b.timestamp - a.timestamp);
    }

    return result;
  }, [logs, selectedUser, selectedModule, selectedTarget, selectedDate, errorsOnly, searchText, dbLimit, isAscending]);

  const onNavigateToDetails = useCallback((id: string) => {
    const match = (subscriptions || []).find(s => s.id === id);
    if (match) {
      setSelectedId(match.id);
      setSelectedRecord(match);
      navigate(AppScreen.DETAILS);
    }
  }, [subscriptions, navigate, setSelectedId, setSelectedRecord]);

  const onToggleStack = useCallback((id: string) => {
    setExpandedStacks(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleExport = async () => {
    const formatTs = (ts: number) => {
      const date = new Date(ts);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const content = filteredLogs.map(log =>
      `[${formatTs(log.timestamp)}] ${log.userName}${log.userRole ? ' (' + log.userRole + ')' : ''} | ${log.os || ''} ${log.device || ''} | ${log.module} | ${log.action} | ${log.targetId || ''} | ${log.description || ''}${log.stack ? '\nSTACK:\n' + log.stack : ''}`
    ).join('\n\n' + '-'.repeat(40) + '\n\n');

    const title = `${UI_TEXT.activityLog}_${new Date().toISOString().slice(0, 10)}.txt`;

    try {
      if (Platform.OS === 'web') {
        const element = document.createElement("a");
        const file = new Blob([content], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = title;
        document.body.appendChild(element);
        element.click();
      } else {
        await Share.share({
          message: content,
          title: title,
        });
      }
    } catch (err) {
      console.error("Export error:", err);
    }
  };

  const generateLocalLogSummary = useCallback((logsToSummary: ActivityLog[]): string => {
    if (logsToSummary.length === 0) return UI_TEXT.noLogsToAnalyze;

    const totalLogs = logsToSummary.length;
    const users = new Set<string>();
    const modules: Record<string, number> = {};
    const actions: Record<string, number> = {};
    const errorLogs: ActivityLog[] = [];
    const checkoutLogs: ActivityLog[] = [];

    logsToSummary.forEach((log) => {
      if (log.userName) users.add(`${log.userName}${log.userRole ? ` (${String(log.userRole).toUpperCase()})` : ''}`);
      modules[log.module] = (modules[log.module] || 0) + 1;
      actions[log.action] = (actions[log.action] || 0) + 1;

      if (log.action === ActivityAction.ERROR) {
        errorLogs.push(log);
      }
      if (log.module === ActivityModule.SCANNER) {
        checkoutLogs.push(log);
      }
    });

    const startTime = new Date(logsToSummary[logsToSummary.length - 1].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date(logsToSummary[logsToSummary.length - 1].timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
    const endTime = new Date(logsToSummary[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date(logsToSummary[0].timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });

    const lines: string[] = [];

    lines.push(`📊 **Operational Activity Overview (${totalLogs} Events)**`);
    lines.push(`• **Time Window**: ${startTime} ➔ ${endTime}`);
    lines.push(`• **Active Users (${users.size})**: ${Array.from(users).join(", ")}`);

    lines.push(`\n📌 **Module Activity Breakdown**`);
    Object.entries(modules).forEach(([mod, count]) => {
      lines.push(`• **${mod.toUpperCase()}**: ${count} operations logged`);
    });

    if (checkoutLogs.length > 0) {
      lines.push(`\n🍽️ **Meal & Scanner Checkouts (${checkoutLogs.length})**`);
      checkoutLogs.slice(0, 5).forEach((cl) => {
        lines.push(`• ${cl.description}`);
      });
      if (checkoutLogs.length > 5) {
        lines.push(`• ... and ${checkoutLogs.length - 5} more checkout operations.`);
      }
    }

    if (errorLogs.length > 0) {
      lines.push(`\n⚠️ **System Errors & Alerts (${errorLogs.length})**`);
      errorLogs.forEach((el) => {
        lines.push(`• [${el.module.toUpperCase()}] ${el.description}`);
      });
    } else {
      lines.push(`\n✅ **System Health**: 0 errors recorded in selected log timeframe.`);
    }

    return lines.join("\n");
  }, []);

  const handleSummarizeLogs = () => {
    if (filteredLogs.length === 0) {
      showAlert(UI_TEXT.error, UI_TEXT.noLogsToAnalyze);
      return;
    }

    const localSummary = generateLocalLogSummary(filteredLogs);
    setSummaryText(localSummary);
    setModalVisible(true);
  };

  const handleLoadMore = async () => {
    if (fetchingMore) return;
    setFetchingMore(true);
    const nextLimit = dbLimit + 50;
    await fetchMoreLogs(nextLimit);
    setDbLimit(nextLimit);
    setFetchingMore(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshAllData(true);
    setRefreshing(false);
  };

  const renderItem = useCallback(({ item, index }: { item: ActivityLog; index: number }) => (
    <ActivityLogItem
      item={item}
      index={index}
      theme={theme}
      styles={styles}
      s={s}
      subscriptions={subscriptions}
      onNavigateToDetails={onNavigateToDetails}
      expanded={!!expandedStacks[item.id]}
      onToggleStack={onToggleStack}
    />
  ), [theme, styles, s, subscriptions, onNavigateToDetails, expandedStacks, onToggleStack]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle={themeType === AppThemeMode.DARK ? "light-content" : "dark-content"} />
      <View style={[styles.header, { paddingBottom: s(20) }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", height: 40, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <BackButton onPress={goBack} />
            <HomeButton onPress={() => navigate(AppScreen.HOME)} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <ThemeToggleButton />
            <LogoutButton onLogout={handleLogout} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
           <View style={{ flex: 1, minWidth: 160 }}>
              <Text style={styles.title}>{UI_TEXT.activityLog}</Text>
              <Text style={styles.subtitle}>{UI_TEXT.activityLogSubtitle}</Text>
           </View>
           <View style={{
             backgroundColor: theme.colors.success,
             paddingHorizontal: 12,
             paddingVertical: 6,
             borderRadius: 20,
             flexDirection: 'row',
             alignItems: 'center',
             gap: 6,
             elevation: 4,
             shadowColor: theme.colors.success,
             shadowOffset: { width: 0, height: 2 },
             shadowOpacity: 0.3,
             shadowRadius: 4
           }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.white }} />
              <Text style={{ fontSize: 11, fontWeight: '900', color: theme.colors.white, letterSpacing: 1 }}>{UI_TEXT.live.toUpperCase()}</Text>
           </View>
        </View>
      </View>

      <View style={{ backgroundColor: theme.colors.surfaceDark + (theme.themeType === AppThemeMode.DARK ? "66" : "80"), borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
        <View style={[styles.maxWidthWrapper, { paddingVertical: 20, gap: 16 }]}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <View style={[styles.searchBox, { flex: 1, minWidth: 160, marginBottom: 0, height: 52, borderRadius: 14, maxWidth: undefined }]}>
              <Ionicons name="search-outline" size={20} color={theme.colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { fontSize: 15 }]}
                value={searchText}
                onChangeText={setSearchText}
                placeholder={UI_TEXT.searchActivities}
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
            <Pressable
              onPress={() => setIsAscending(!isAscending)}
              style={({ pressed }) => [
                { width: 52, height: 52, borderRadius: 14, backgroundColor: theme.colors.surfaceDark, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
                pressed && { opacity: 0.7 }
              ]}
            >
              <Ionicons name={isAscending ? "arrow-up-outline" : "arrow-down-outline"} size={22} color={theme.colors.primary} />
            </Pressable>
            <Pressable
              onPress={() => setShowFilters(!showFilters)}
              style={({ pressed }) => [
                { width: 52, height: 52, borderRadius: 14, backgroundColor: showFilters ? theme.colors.primary : theme.colors.surfaceDark, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
                pressed && { opacity: 0.7 }
              ]}
            >
              <Ionicons name="options-outline" size={22} color={showFilters ? theme.colors.white : theme.colors.textPrimary} />
            </Pressable>
          </View>

          {showFilters && (
            <View style={{ gap: 16, paddingTop: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.colors.surfaceDark, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border }}>
                 <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.error + "20", alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="alert-circle" size={20} color={theme.colors.error} />
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: theme.colors.textPrimary }}>{UI_TEXT.filterErrors}</Text>
                 </View>
                 <Switch
                   value={errorsOnly}
                   onValueChange={setErrorsOnly}
                   trackColor={{ true: theme.colors.error }}
                   style={{ transform: [{ scale: 0.9 }] }}
                 />
              </View>

              <View>
                <Text style={{ fontSize: 11, fontWeight: '800', color: theme.colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', marginLeft: 4 }}>{UI_TEXT.filterByUser}</Text>
                <Dropdown value={selectedUser} options={userOptions} onChange={setSelectedUser} />
              </View>

              <View>
                <Text style={{ fontSize: 11, fontWeight: '800', color: theme.colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', marginLeft: 4 }}>{UI_TEXT.filterByDate}</Text>
                <Dropdown value={selectedDate} options={dateOptions} onChange={setSelectedDate} />
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: theme.colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', marginLeft: 4 }}>{UI_TEXT.filterByEvent}</Text>
                  <Dropdown value={selectedModule} options={moduleOptions} onChange={setSelectedModule} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: theme.colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', marginLeft: 4 }}>{UI_TEXT.filterByTarget}</Text>
                  <Dropdown value={selectedTarget} options={targetOptions} onChange={setSelectedTarget} />
                </View>
              </View>
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: s(10), marginTop: s(4) }}>
            <Pressable
              onPress={handleExport}
              style={({ pressed }) => [
                styles.primary,
                {
                  flex: 1,
                  height: s(48),
                  marginTop: 0,
                  flexDirection: 'row',
                  gap: s(8),
                  borderRadius: s(14),
                  backgroundColor: theme.colors.secondary,
                },
                pressed && { opacity: 0.7 }
              ]}
            >
              <Ionicons name="share-outline" size={20} color={theme.colors.white} />
              <Text style={[styles.primaryText, { fontSize: 14 }]}>{UI_TEXT.exportLog}</Text>
            </Pressable>

            <Pressable
              onPress={handleSummarizeLogs}
              disabled={filteredLogs.length === 0}
              style={({ pressed }) => [
                styles.primary,
                {
                  flex: 1,
                  height: s(48),
                  marginTop: 0,
                  flexDirection: 'row',
                  gap: s(8),
                  borderRadius: s(14),
                  backgroundColor: filteredLogs.length === 0 ? theme.colors.border : theme.colors.primary,
                },
                pressed && filteredLogs.length > 0 && { opacity: 0.7 }
              ]}
            >
              <Ionicons name="analytics-outline" size={20} color={theme.colors.white} />
              <Text style={[styles.primaryText, { fontSize: 14 }]}>
                {UI_TEXT.analyzeLogs}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {loading && !refreshing && logs.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 12, color: theme.colors.textSecondary, fontWeight: '600' }}>{UI_TEXT.loading}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredLogs}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.content, { paddingTop: 20 }]}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          removeClippedSubviews={Platform.OS === 'android'}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <View style={{ backgroundColor: theme.colors.surfaceDark, padding: 20, borderRadius: 30, marginBottom: 16 }}>
                <Ionicons name="time-outline" size={48} color={theme.colors.border} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary }}>{UI_TEXT.noRecords}</Text>
              <Text style={{ marginTop: 6, color: theme.colors.textMuted, textAlign: 'center', paddingHorizontal: 40 }}>{UI_TEXT.noActivities}</Text>
            </View>
          }
          ListFooterComponent={
            <View style={{ gap: 20 }}>
              {logs.length >= dbLimit && (
                <Pressable
                  onPress={handleLoadMore}
                  disabled={fetchingMore}
                  style={({ pressed }) => [
                    styles.secondary,
                    { borderStyle: 'dashed', marginTop: 10, height: 50, borderRadius: 12 },
                    pressed && { backgroundColor: theme.colors.surfaceDark }
                  ]}
                >
                   {fetchingMore ? (
                     <ActivityIndicator size="small" color={theme.colors.primary} />
                   ) : (
                     <Text style={styles.secondaryText}>{UI_TEXT.loadMore}</Text>
                   )}
                </Pressable>
              )}
              <View style={styles.footer}>
                 <Text style={styles.footerText}>{UI_TEXT.footerCopyright}</Text>
              </View>
            </View>
          }
        />
      )}

      {/* Activity Summary Modal Window */}
      <Modal
        visible={summaryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: theme.colors.shadow + "CC",
          justifyContent: "center",
          alignItems: "center",
          padding: 12
        }}>
          <View style={{
            width: "100%",
            maxWidth: Math.min(width * 0.94, 520),
            maxHeight: "85%",
            backgroundColor: theme.colors.surface,
            borderRadius: 20,
            padding: 16,
            borderWidth: 1,
            borderColor: theme.colors.border,
            ...Platform.select({
              ios: {
                shadowColor: theme.colors.shadow,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8
              },
              android: { elevation: 8 },
              web: { boxShadow: `0 4px 16px ${theme.colors.shadow}66` }
            })
          }}>
            {/* Header */}
            <View style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
              paddingBottom: 10,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="analytics" size={20} color={theme.colors.primary} />
                <Text style={{ fontSize: 16, fontWeight: "900", color: theme.colors.textPrimary }}>
                  {UI_TEXT.aiSummaryTitle}
                </Text>
              </View>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={({ pressed }) => [
                  { padding: 4, borderRadius: 12, backgroundColor: theme.colors.surfaceDark },
                  pressed && { opacity: 0.7 }
                ]}
              >
                <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
              </Pressable>
            </View>

            {/* Content Viewport */}
            <ScrollView
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ paddingVertical: 8, gap: 12 }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={{
                backgroundColor: theme.colors.surfaceDark,
                padding: 14,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: theme.colors.border
              }}>
                <Text style={{
                  fontSize: 14,
                  lineHeight: 22,
                  color: theme.colors.textPrimary,
                  fontWeight: "600"
                }}>
                  {summaryText}
                </Text>
              </View>
            </ScrollView>

            {/* Footer Close Button */}
            <View style={{ marginTop: 12 }}>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={({ pressed }) => [
                  styles.primary,
                  { height: 44, borderRadius: 12, backgroundColor: theme.colors.primary, marginTop: 0 },
                  pressed && { opacity: 0.85 }
                ]}
              >
                <Text style={[styles.primaryText, { fontSize: 14 }]}>
                  {UI_TEXT.close}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
