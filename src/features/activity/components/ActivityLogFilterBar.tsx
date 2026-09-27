import React from "react";
import { View, Text, Pressable, TextInput, Switch, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UI_TEXT } from "../../../strings";
import { Dropdown } from "../../../components/common/Dropdown";

interface ActivityLogFilterBarProps {
  searchText: string;
  setSearchText: (text: string) => void;
  isAscending: boolean;
  setIsAscending: (val: boolean) => void;
  showFilters: boolean;
  setShowFilters: (val: boolean) => void;
  errorsOnly: boolean;
  setErrorsOnly: (val: boolean) => void;
  selectedUser: string;
  setSelectedUser: (val: string) => void;
  userOptions: string[];
  selectedDate: string;
  setSelectedDate: (val: string) => void;
  dateOptions: string[];
  selectedModule: string;
  setSelectedModule: (val: string) => void;
  moduleOptions: string[];
  selectedTarget: string;
  setSelectedTarget: (val: string) => void;
  targetOptions: string[];
  handleExport: () => void;
  handleSummarizeLogs: () => void;
  filteredLogsCount: number;
  theme: any;
  styles: any;
  s: (n: number) => number;
}

export const ActivityLogFilterBar: React.FC<ActivityLogFilterBarProps> = ({
  searchText,
  setSearchText,
  isAscending,
  setIsAscending,
  showFilters,
  setShowFilters,
  errorsOnly,
  setErrorsOnly,
  selectedUser,
  setSelectedUser,
  userOptions,
  selectedDate,
  setSelectedDate,
  dateOptions,
  selectedModule,
  setSelectedModule,
  moduleOptions,
  selectedTarget,
  setSelectedTarget,
  targetOptions,
  handleExport,
  handleSummarizeLogs,
  filteredLogsCount,
  theme,
  styles,
  s,
}) => {
  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surfaceDark + (theme.themeType === 'dark' ? "66" : "80"), marginBottom: 16, gap: 16 }]}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <View style={[styles.searchBox, { flex: 1, minWidth: 160, marginBottom: 0, height: 52, borderRadius: 14, maxWidth: undefined }]}>
          <Ionicons name="search-outline" size={20} color={theme.colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { fontSize: 15 }]}
            value={searchText}
            onChangeText={setSearchText}
            placeholder={UI_TEXT.searchActivities}
            placeholderTextColor={theme.colors.textMuted}
            accessible={true}
            accessibilityLabel={UI_TEXT.searchActivities}
          />
        </View>
        <Pressable
          onPress={() => setIsAscending(!isAscending)}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={UI_TEXT.activityLog}
          style={({ pressed }) => [
            { width: 52, height: 52, borderRadius: 14, backgroundColor: theme.colors.surfaceDark, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
            pressed && { opacity: 0.7 }
          ]}
        >
          <Ionicons name={isAscending ? "arrow-up-outline" : "arrow-down-outline"} size={22} color={theme.colors.primary} />
        </Pressable>
        <Pressable
          onPress={() => setShowFilters(!showFilters)}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={UI_TEXT.reportFilters}
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
          disabled={filteredLogsCount === 0}
          style={({ pressed }) => [
            styles.primary,
            {
              flex: 1,
              height: s(48),
              marginTop: 0,
              flexDirection: 'row',
              gap: s(8),
              borderRadius: s(14),
              backgroundColor: filteredLogsCount === 0 ? theme.colors.border : theme.colors.primary,
            },
            pressed && filteredLogsCount > 0 && { opacity: 0.7 }
          ]}
        >
          <Ionicons name="analytics-outline" size={20} color={theme.colors.white} />
          <Text style={[styles.primaryText, { fontSize: 14 }]}>
            {UI_TEXT.analyzeLogs}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};
