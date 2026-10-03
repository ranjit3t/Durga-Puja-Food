/**
 * Activity Log Screen for Admins.
 * Displays a historical list of system operations with filtering, search, and activity log analysis.
 * Connects directly to live WebSocket-streamed logs in DatabaseContext.
 */
import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StatusBar,
  ActivityIndicator,
  FlatList,
  Share,
  Platform,
  Modal,
  ScrollView,
  useWindowDimensions,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles, useScaling } from "../styles";
import { useAppTheme } from "../theme";
import { UI_TEXT } from "../strings";
import { ActivityLog, ActivityModule, ActivityAction, AppThemeMode, AppScreen } from "../domain";
import { BackButton } from "../components/common/BackButton";
import { HomeButton } from "../components/common/HomeButton";
import { LogoutButton } from "../components/common/LogoutButton";
import { ThemeToggleButton } from "../components/common/ThemeToggleButton";
import { UserGreeting } from "../components/common/UserGreeting";
import { useChat } from "../context/ChatContext";

import { useAuth } from "../context/AuthContext";
import { useCoreDatabase, useActivityLogs } from "../context/DatabaseContext";
import { useUI } from "../context/UIContext";
import { useAppNavigation } from "../context/NavigationContext";

import { ActivityLogItem } from "../features/activity/components/ActivityLogItem";
import { ActivityLogFilterBar } from "../features/activity/components/ActivityLogFilterBar";

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
  const { registerModalOpen, unregisterModalOpen } = useChat();

  React.useEffect(() => {
    if (summaryModalVisible) {
      registerModalOpen("activity_summary");
      return () => unregisterModalOpen("activity_summary");
    }
  }, [summaryModalVisible, registerModalOpen, unregisterModalOpen]);

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

    lines.push(`📊 **${UI_TEXT.operationalOverview} (${totalLogs} Events)**`);
    lines.push(`• **${UI_TEXT.timeWindow}**: ${startTime} ➔ ${endTime}`);
    lines.push(`• **${UI_TEXT.activeUsers} (${users.size})**: ${Array.from(users).join(", ")}`);

    lines.push(`\n📌 **${UI_TEXT.moduleActivityBreakdown}**`);
    Object.entries(modules).forEach(([mod, count]) => {
      lines.push(`• **${mod.toUpperCase()}**: ${count} ${UI_TEXT.operationsLogged}`);
    });

    if (checkoutLogs.length > 0) {
      lines.push(`\n🍽️ **${UI_TEXT.mealScannerCheckouts} (${checkoutLogs.length})**`);
      checkoutLogs.slice(0, 5).forEach((cl) => {
        lines.push(`• ${cl.description}`);
      });
      if (checkoutLogs.length > 5) {
        lines.push(`• ... and ${checkoutLogs.length - 5} ${UI_TEXT.moreCheckoutOperations}.`);
      }
    }

    if (errorLogs.length > 0) {
      lines.push(`\n⚠️ **${UI_TEXT.systemErrorsAlerts} (${errorLogs.length})**`);
      errorLogs.forEach((el) => {
        lines.push(`• [${el.module.toUpperCase()}] ${el.description}`);
      });
    } else {
      lines.push(`\n✅ **${UI_TEXT.systemHealthZeroErrors}**`);
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
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", height: 40, marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <BackButton onPress={goBack} />
            <HomeButton onPress={() => navigate(AppScreen.HOME)} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <ThemeToggleButton />
            <LogoutButton onLogout={handleLogout} />
          </View>
        </View>
        <UserGreeting />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
           <View style={{ flex: 1, minWidth: 160 }}>
              <Text style={styles.title}>{UI_TEXT.activityLog}</Text>
              <Text style={styles.subtitle}>{UI_TEXT.activityLogSubtitle}</Text>
           </View>
           <View style={[
             {
               backgroundColor: theme.colors.success,
               paddingHorizontal: 12,
               paddingVertical: 6,
               borderRadius: 20,
               flexDirection: 'row',
               alignItems: 'center',
               gap: 6,
               elevation: 4,
             },
             Platform.select({
               ios: {
                 shadowColor: theme.colors.success,
                 shadowOffset: { width: 0, height: 2 },
                 shadowOpacity: 0.3,
                 shadowRadius: 4,
               },
               android: { elevation: 4 },
               default: {
                 boxShadow: `0px 2px 8px ${theme.colors.success}66`,
               },
             })
           ]}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.white }} />
              <Text style={{ fontSize: 11, fontWeight: '900', color: theme.colors.white, letterSpacing: 1 }}>{UI_TEXT.live.toUpperCase()}</Text>
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
          ListHeaderComponent={
            <ActivityLogFilterBar
              searchText={searchText}
              setSearchText={setSearchText}
              isAscending={isAscending}
              setIsAscending={setIsAscending}
              showFilters={showFilters}
              setShowFilters={setShowFilters}
              errorsOnly={errorsOnly}
              setErrorsOnly={setErrorsOnly}
              selectedUser={selectedUser}
              setSelectedUser={setSelectedUser}
              userOptions={userOptions}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              dateOptions={dateOptions}
              selectedModule={selectedModule}
              setSelectedModule={setSelectedModule}
              moduleOptions={moduleOptions}
              selectedTarget={selectedTarget}
              setSelectedTarget={setSelectedTarget}
              targetOptions={targetOptions}
              handleExport={handleExport}
              handleSummarizeLogs={handleSummarizeLogs}
              filteredLogsCount={filteredLogs.length}
              theme={theme}
              styles={styles}
              s={s}
            />
          }
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
            borderRadius: 24,
            padding: 20,
            borderWidth: 1,
            borderColor: theme.colors.border,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 10
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
               <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                 <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.primary + "20", alignItems: 'center', justifyContent: 'center' }}>
                   <Ionicons name="analytics" size={20} color={theme.colors.primary} />
                 </View>
                 <Text style={{ fontSize: 18, fontWeight: '900', color: theme.colors.textPrimary }}>{UI_TEXT.operationalSummary}</Text>
               </View>
               <Pressable
                 onPress={() => setModalVisible(false)}
                 style={({ pressed }) => [
                   { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.surfaceDark, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
                   pressed && { opacity: 0.7 }
                 ]}
               >
                 <Ionicons name="close" size={20} color={theme.colors.textPrimary} />
               </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 14, color: theme.colors.textPrimary, lineHeight: 22, fontWeight: '600' }}>
                {summaryText}
              </Text>
            </ScrollView>

            <Pressable
              onPress={() => setModalVisible(false)}
              style={({ pressed }) => [
                styles.primary,
                { marginTop: 12, height: 48, borderRadius: 14 },
                pressed && { opacity: 0.7 }
              ]}
            >
              <Text style={styles.primaryText}>{UI_TEXT.close}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
