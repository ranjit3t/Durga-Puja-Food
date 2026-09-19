/**
 * Activity Log Screen for Admins.
 * Displays a historical list of system operations with filtering and search.
 * Auto-refreshes every 10 seconds to serve as a live distribution dashboard.
 */
import React, { useState, useEffect, useMemo, useCallback } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../styles";
import { useAppTheme, StatusBarStyleMode } from "../theme";
import { UI_TEXT } from "../strings";
import { AppScreen, ActivityLog, ActivityModule, ActivityAction, AppThemeMode } from "../domain";
import { BackButton } from "../components/common/BackButton";
import { HomeButton } from "../components/common/HomeButton";
import { LogoutButton } from "../components/common/LogoutButton";
import { Dropdown } from "../components/common/Dropdown";

import { useAuth } from "../context/AuthContext";
import { useDatabase } from "../context/DatabaseContext";
import { useAppNavigation } from "../context/NavigationContext";

export function ActivityLogScreen() {
  const { handleLogout } = useAuth();
  const { getActivityLogs } = useDatabase();
  const { navigate, goBack } = useAppNavigation();

  const styles = useStyles();
  const { theme, themeType } = useAppTheme();

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [limit, setLimit] = useState(20);
  const [expandedStacks, setExpandedStacks] = useState<Record<string, boolean>>({});

  // Filters & Search
  const [selectedUser, setSelectedUser] = useState(UI_TEXT.all);
  const [selectedModule, setSelectedModule] = useState(UI_TEXT.all);
  const [selectedTarget, setSelectedTarget] = useState(UI_TEXT.all);
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const userOptions = useMemo(() => {
    const users = new Set<string>();
    users.add(UI_TEXT.all);
    logs.forEach(log => users.add(log.userName));
    return Array.from(users).sort();
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

  const loadLogs = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const data = await getActivityLogs(100);
      setLogs(data);
    } catch (err) {
      console.error("Failed to load activity logs:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getActivityLogs]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // 10s Auto-refresh
  useEffect(() => {
    const timer = setInterval(() => {
      loadLogs(true);
    }, 10000);
    return () => clearInterval(timer);
  }, [loadLogs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (selectedUser !== UI_TEXT.all && log.userName !== selectedUser) return false;
      if (selectedModule !== UI_TEXT.all && log.module !== selectedModule) return false;
      if (selectedTarget !== UI_TEXT.all && log.targetId !== selectedTarget) return false;
      if (errorsOnly && log.action !== ActivityAction.ERROR) return false;
      if (searchText && !log.description?.toLowerCase().includes(searchText.toLowerCase())) return false;
      return true;
    }).slice(0, limit);
  }, [logs, selectedUser, selectedModule, selectedTarget, errorsOnly, searchText, limit]);

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const handleExport = async () => {
    const content = filteredLogs.map(log =>
      `[${formatTimestamp(log.timestamp)}] ${log.userName} | ${log.os || ''} ${log.device || ''} | ${log.module} | ${log.action} | ${log.targetId || ''} | ${log.description || ''}${log.stack ? '\nSTACK:\n' + log.stack : ''}`
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

  const renderItem = ({ item, index }: { item: ActivityLog; index: number }) => {
    const colorScheme = theme.cardColors[index % theme.cardColors.length];
    const isError = item.action === ActivityAction.ERROR;

    return (
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: isError ? theme.colors.error : theme.colors.border, marginBottom: 12, padding: 14, elevation: 2, borderLeftWidth: isError ? 4 : 1.5 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <View style={{ backgroundColor: isError ? theme.colors.error + "15" : theme.colors.primary + "15", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: isError ? theme.colors.error : theme.colors.primary }}>{item.userName}</Text>
              </View>
              <Text style={{ fontSize: 10, color: theme.colors.textMuted, fontWeight: '600' }}>{formatTimestamp(item.timestamp)}</Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
               <View style={{ backgroundColor: isError ? theme.colors.error + "20" : colorScheme.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: isError ? theme.colors.error : colorScheme.border }}>
                  <Text style={{ fontSize: 10, fontWeight: '900', color: isError ? theme.colors.error : colorScheme.accent }}>{item.module.toUpperCase()}</Text>
               </View>
               <Text style={{ fontSize: 14, fontWeight: '700', color: isError ? theme.colors.error : theme.colors.textPrimary }}>{item.action}</Text>
               {item.targetId && (
                 <View style={{ backgroundColor: theme.colors.surfaceDark, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                   <Text style={{ fontSize: 10, fontWeight: '800', color: theme.colors.secondary }}>{item.targetId}</Text>
                 </View>
               )}
            </View>

            {item.description && (
              <Text style={{ fontSize: 13, color: isError ? theme.colors.error : theme.colors.textSecondary, lineHeight: 18, marginBottom: 8 }}>{item.description}</Text>
            )}

            {isError && item.stack && (
              <View style={{ marginTop: 4, marginBottom: 8 }}>
                <Pressable
                  onPress={() => setExpandedStacks(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.error + "10", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' }}
                >
                  <Ionicons name={expandedStacks[item.id] ? "chevron-up" : "chevron-down"} size={12} color={theme.colors.error} />
                  <Text style={{ fontSize: 10, fontWeight: '800', color: theme.colors.error }}>STACK TRACE</Text>
                </Pressable>
                {expandedStacks[item.id] && (
                  <View style={{ backgroundColor: theme.colors.surfaceDark, padding: 10, borderRadius: 8, marginTop: 6, borderWidth: 1, borderColor: theme.colors.error + "33" }}>
                    <Text style={{ fontSize: 10, color: theme.colors.error, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>{item.stack}</Text>
                  </View>
                )}
              </View>
            )}

            {item.os && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name={item.os.toLowerCase() === 'ios' ? 'logo-apple' : item.os.toLowerCase() === 'android' ? 'logo-android' : 'globe-outline'} size={12} color={theme.colors.textMuted} />
                <Text style={{ fontSize: 10, color: theme.colors.textMuted, fontWeight: '700', textTransform: 'uppercase' }}>{item.os} {item.device}</Text>
              </View>
            )}
          </View>

          <View style={{ backgroundColor: isError ? theme.colors.error + "10" : theme.colors.surfaceDark, padding: 8, borderRadius: 12 }}>
            <Ionicons
              name={
                item.action === ActivityAction.CREATE ? "add-circle" :
                item.action === ActivityAction.DELETE ? "trash" :
                item.action === ActivityAction.SCAN ? "qr-code" :
                item.action === ActivityAction.CHAT ? "logo-whatsapp" :
                item.action === ActivityAction.CALL ? "call" :
                item.action === ActivityAction.LOGIN ? "log-in" :
                item.action === ActivityAction.LOGOUT ? "log-out" :
                item.action === ActivityAction.ERROR ? "alert-circle" :
                "pencil"
              }
              size={18}
              color={
                item.action === ActivityAction.DELETE || item.action === ActivityAction.ERROR ? theme.colors.error :
                item.action === ActivityAction.CREATE ? theme.colors.success :
                theme.colors.primary
              }
            />
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar style={themeType === AppThemeMode.DARK ? StatusBarStyleMode.LIGHT : StatusBarStyleMode.DARK} />
      <View style={styles.header}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", height: 40, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <BackButton onPress={goBack} />
            <HomeButton onPress={() => navigate(AppScreen.HOME)} />
          </View>
          <LogoutButton onLogout={handleLogout} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
           <View>
              <Text style={styles.title}>{UI_TEXT.activityLog}</Text>
              <Text style={styles.subtitle}>{UI_TEXT.activityLogSubtitle}</Text>
           </View>
           <View style={{ backgroundColor: theme.colors.success + "20", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: theme.colors.success + "40" }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.success }} />
              <Text style={{ fontSize: 11, fontWeight: '900', color: theme.colors.success }}>{UI_TEXT.live.toUpperCase()}</Text>
           </View>
        </View>
      </View>

      <View style={{ backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
        <View style={{ padding: 20, gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={[styles.searchBox, { flex: 1, marginBottom: 0, height: 48, borderRadius: 12 }]}>
              <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { fontSize: 14 }]}
                value={searchText}
                onChangeText={setSearchText}
                placeholder={UI_TEXT.searchActivities}
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
            <Pressable
              onPress={() => setShowFilters(!showFilters)}
              style={({ pressed }) => [
                { width: 48, height: 48, borderRadius: 12, backgroundColor: showFilters ? theme.colors.primary : theme.colors.surfaceDark, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
                pressed && { opacity: 0.7 }
              ]}
            >
              <Ionicons name="filter-outline" size={20} color={showFilters ? theme.colors.white : theme.colors.textPrimary} />
            </Pressable>
          </View>

          {showFilters && (
            <View style={{ gap: 12, paddingTop: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.colors.surfaceDark, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border }}>
                 <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="alert-circle-outline" size={18} color={theme.colors.error} />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.textPrimary }}>{UI_TEXT.filterErrors}</Text>
                 </View>
                 <Switch
                   value={errorsOnly}
                   onValueChange={setErrorsOnly}
                   trackColor={{ true: theme.colors.error }}
                   style={{ transform: [{ scale: 0.8 }] }}
                 />
              </View>

              <View>
                <Text style={{ fontSize: 10, fontWeight: '800', color: theme.colors.textSecondary, marginBottom: 6, textTransform: 'uppercase', marginLeft: 4 }}>{UI_TEXT.filterByUser}</Text>
                <Dropdown value={selectedUser} options={userOptions} onChange={setSelectedUser} />
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: theme.colors.textSecondary, marginBottom: 6, textTransform: 'uppercase', marginLeft: 4 }}>{UI_TEXT.filterByEvent}</Text>
                  <Dropdown value={selectedModule} options={moduleOptions} onChange={setSelectedModule} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: theme.colors.textSecondary, marginBottom: 6, textTransform: 'uppercase', marginLeft: 4 }}>{UI_TEXT.filterByTarget}</Text>
                  <Dropdown value={selectedTarget} options={targetOptions} onChange={setSelectedTarget} />
                </View>
              </View>
            </View>
          )}

          <Pressable
            onPress={handleExport}
            style={({ pressed }) => [
              styles.primary,
              { height: 44, marginTop: 4, flexDirection: 'row', gap: 8, borderRadius: 12, backgroundColor: theme.colors.secondary },
              pressed && { opacity: 0.7 }
            ]}
          >
            <Ionicons name="cloud-download-outline" size={18} color={theme.colors.white} />
            <Text style={[styles.primaryText, { fontSize: 14 }]}>{UI_TEXT.exportLog}</Text>
          </Pressable>
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 12, color: theme.colors.textSecondary, fontWeight: '600' }}>{UI_TEXT.loading}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredLogs}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); loadLogs(); }}
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
              {logs.length >= limit && (
                <Pressable
                  onPress={() => setLimit(prev => prev + 20)}
                  style={({ pressed }) => [
                    styles.secondary,
                    { borderStyle: 'dashed', marginTop: 10, height: 50, borderRadius: 12 },
                    pressed && { backgroundColor: theme.colors.surfaceDark }
                  ]}
                >
                   <Text style={styles.secondaryText}>{UI_TEXT.loadMore}</Text>
                </Pressable>
              )}
              <View style={styles.footer}>
                 <Text style={styles.footerText}>{UI_TEXT.footerCopyright}</Text>
              </View>
            </View>
          }
        />
      )}
    </View>
  );
}
