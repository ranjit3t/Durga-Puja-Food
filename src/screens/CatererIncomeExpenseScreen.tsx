/**
 * Caterer Income & Expense Screen
 * Visible to Caterer and Admin only. Tracks operational income and expenses across categories entered by operators, and computes net balance.
 * Protects subscription and user payment privacy by not leaking subscription database totals.
 */
import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
  TextInput,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles, useScaling } from "../styles";
import { useAppTheme } from "../theme";
import { UI_TEXT } from "../strings";
import { AppScreen, UserRole, CatererFinanceCategory, CatererTransaction, AppThemeMode } from "../domain";
import { BackButton } from "../components/common/BackButton";
import { HomeButton } from "../components/common/HomeButton";
import { LogoutButton } from "../components/common/LogoutButton";
import { ThemeToggleButton } from "../components/common/ThemeToggleButton";
import { UserGreeting } from "../components/common/UserGreeting";
import { Dropdown } from "../components/common/Dropdown";

import { useAuth } from "../context/AuthContext";
import { useAppNavigation } from "../context/NavigationContext";
import { useUI } from "../context/UIContext";
import { useCatererFinance } from "../context/DatabaseContext";

const CATEGORY_LABEL_MAP: Record<CatererFinanceCategory, string> = {
  [CatererFinanceCategory.RAW_MATERIALS]: UI_TEXT.expenseCategoryRawMaterials,
  [CatererFinanceCategory.LOGISTICS]: UI_TEXT.expenseCategoryLogistics,
  [CatererFinanceCategory.UTILITIES]: UI_TEXT.expenseCategoryUtilities,
  [CatererFinanceCategory.LABOR]: UI_TEXT.expenseCategoryLabor,
  [CatererFinanceCategory.MISC]: UI_TEXT.expenseCategoryMisc,
  [CatererFinanceCategory.ORGANIZER_PAYMENTS]: UI_TEXT.incomeCategoryOrganizerPayments,
  [CatererFinanceCategory.OTHER_INCOME]: UI_TEXT.incomeCategoryOther,
  [CatererFinanceCategory.SUBSCRIPTIONS]: UI_TEXT.incomeCategorySubscriptions,
  [CatererFinanceCategory.PACKAGES]: UI_TEXT.incomeCategoryPackages,
};

const CATEGORY_FROM_LABEL: Record<string, CatererFinanceCategory> = {
  [UI_TEXT.expenseCategoryRawMaterials]: CatererFinanceCategory.RAW_MATERIALS,
  [UI_TEXT.expenseCategoryLogistics]: CatererFinanceCategory.LOGISTICS,
  [UI_TEXT.expenseCategoryUtilities]: CatererFinanceCategory.UTILITIES,
  [UI_TEXT.expenseCategoryLabor]: CatererFinanceCategory.LABOR,
  [UI_TEXT.expenseCategoryMisc]: CatererFinanceCategory.MISC,
  [UI_TEXT.incomeCategoryOrganizerPayments]: CatererFinanceCategory.ORGANIZER_PAYMENTS,
  [UI_TEXT.incomeCategoryOther]: CatererFinanceCategory.OTHER_INCOME,
  [UI_TEXT.incomeCategorySubscriptions]: CatererFinanceCategory.SUBSCRIPTIONS,
  [UI_TEXT.incomeCategoryPackages]: CatererFinanceCategory.PACKAGES,
};

export function CatererIncomeExpenseScreen() {
  const { userRole, userName, handleLogout } = useAuth();
  const { navigate, goBack } = useAppNavigation();
  const { showAlert } = useUI();

  const styles = useStyles();
  const { s } = useScaling();
  const { theme, themeType } = useAppTheme();

  // Role check: Only Caterer and Admin allowed
  const isAuthorized = userRole === UserRole.CATERER || userRole === UserRole.ADMIN;

  // Database-persisted caterer transactions with real-time websocket sync
  const { catererTransactions: transactions, upsertCatererTransaction, deleteCatererTransaction } = useCatererFinance();

  // Modal state for adding a new transaction
  const [showAddModal, setShowAddModal] = useState(false);
  const [txType, setTxType] = useState<"income" | "expense">("expense");
  const [txCategory, setTxCategory] = useState<CatererFinanceCategory>(CatererFinanceCategory.RAW_MATERIALS);
  const [txAmount, setTxAmount] = useState("");
  const [txDescription, setTxDescription] = useState("");

  const expenseOptions = useMemo(() => [
    UI_TEXT.expenseCategoryRawMaterials,
    UI_TEXT.expenseCategoryLogistics,
    UI_TEXT.expenseCategoryUtilities,
    UI_TEXT.expenseCategoryLabor,
    UI_TEXT.expenseCategoryMisc,
  ], []);

  const incomeOptions = useMemo(() => [
    UI_TEXT.incomeCategoryOrganizerPayments,
    UI_TEXT.incomeCategoryOther,
    UI_TEXT.incomeCategorySubscriptions,
    UI_TEXT.incomeCategoryPackages,
  ], []);

  // Total income across user-added income transactions
  const totalIncome = useMemo(() => {
    return transactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  // Total expenses across user-added expense transactions
  const totalExpenses = useMemo(() => {
    return transactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const netBalance = totalIncome - totalExpenses;

  // Category breakdown for expenses and income
  const categorySummary = useMemo(() => {
    const summary: Record<string, { label: string; total: number; type: "income" | "expense"; icon: string }> = {
      [CatererFinanceCategory.ORGANIZER_PAYMENTS]: {
        label: UI_TEXT.incomeCategoryOrganizerPayments,
        total: transactions.filter(t => t.category === CatererFinanceCategory.ORGANIZER_PAYMENTS).reduce((s, t) => s + t.amount, 0),
        type: "income",
        icon: "wallet-outline",
      },
      [CatererFinanceCategory.SUBSCRIPTIONS]: {
        label: UI_TEXT.incomeCategorySubscriptions,
        total: transactions.filter(t => t.category === CatererFinanceCategory.SUBSCRIPTIONS).reduce((s, t) => s + t.amount, 0),
        type: "income",
        icon: "cash-outline",
      },
      [CatererFinanceCategory.PACKAGES]: {
        label: UI_TEXT.incomeCategoryPackages,
        total: transactions.filter(t => t.category === CatererFinanceCategory.PACKAGES).reduce((s, t) => s + t.amount, 0),
        type: "income",
        icon: "gift-outline",
      },
      [CatererFinanceCategory.OTHER_INCOME]: {
        label: UI_TEXT.incomeCategoryOther,
        total: transactions.filter(t => t.category === CatererFinanceCategory.OTHER_INCOME).reduce((s, t) => s + t.amount, 0),
        type: "income",
        icon: "trending-up-outline",
      },
      [CatererFinanceCategory.RAW_MATERIALS]: {
        label: UI_TEXT.expenseCategoryRawMaterials,
        total: transactions.filter(t => t.category === CatererFinanceCategory.RAW_MATERIALS).reduce((s, t) => s + t.amount, 0),
        type: "expense",
        icon: "basket-outline",
      },
      [CatererFinanceCategory.LOGISTICS]: {
        label: UI_TEXT.expenseCategoryLogistics,
        total: transactions.filter(t => t.category === CatererFinanceCategory.LOGISTICS).reduce((s, t) => s + t.amount, 0),
        type: "expense",
        icon: "car-outline",
      },
      [CatererFinanceCategory.UTILITIES]: {
        label: UI_TEXT.expenseCategoryUtilities,
        total: transactions.filter(t => t.category === CatererFinanceCategory.UTILITIES).reduce((s, t) => s + t.amount, 0),
        type: "expense",
        icon: "flame-outline",
      },
      [CatererFinanceCategory.LABOR]: {
        label: UI_TEXT.expenseCategoryLabor,
        total: transactions.filter(t => t.category === CatererFinanceCategory.LABOR).reduce((s, t) => s + t.amount, 0),
        type: "expense",
        icon: "people-outline",
      },
      [CatererFinanceCategory.MISC]: {
        label: UI_TEXT.expenseCategoryMisc,
        total: transactions.filter(t => t.category === CatererFinanceCategory.MISC).reduce((s, t) => s + t.amount, 0),
        type: "expense",
        icon: "receipt-outline",
      },
    };
    return summary;
  }, [transactions]);

  const activeCategories = useMemo(() => {
    return Object.entries(categorySummary).filter(([_, cat]) => cat.total > 0);
  }, [categorySummary]);

  const handleAddTransaction = async () => {
    const amt = parseFloat(txAmount);
    if (isNaN(amt) || amt <= 0) {
      showAlert(UI_TEXT.confirmDisableTitle, UI_TEXT.validAmountError);
      return;
    }
    if (!txDescription.trim()) {
      showAlert(UI_TEXT.confirmDisableTitle, UI_TEXT.validDescriptionError);
      return;
    }

    const newTx: CatererTransaction = {
      id: `tx-${Date.now()}`,
      type: txType,
      category: txCategory,
      amount: amt,
      description: txDescription.trim(),
      date: Date.now(),
      addedBy: userName || "Caterer / Admin",
    };

    await upsertCatererTransaction(newTx);
    setTxAmount("");
    setTxDescription("");
    setShowAddModal(false);
  };

  const handleDeleteTransaction = async (id: string) => {
    await deleteCatererTransaction(id);
  };

  const handleExportCsv = async () => {
    try {
      if (transactions.length === 0) {
        showAlert(UI_TEXT.confirmDisableTitle, UI_TEXT.noTransactionsExportError);
        return;
      }
      const rows: string[] = [];
      rows.push("ID,Type,Category,Amount (INR),Description,Date,Added By");
      transactions.forEach(t => {
        rows.push(`"${t.id}","${t.type}","${t.category}",${t.amount},"${t.description.replace(/"/g, '""')}","${new Date(t.date).toISOString()}","${t.addedBy}"`);
      });
      const csvContent = rows.join("\n");
      const fileName = `caterer_finance_${new Date().toISOString().slice(0, 10)}.csv`;

      if (Platform.OS === "web") {
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const { Share } = await import("react-native");
        await Share.share({ message: csvContent, title: fileName });
      }
    } catch (err) {
      console.error("Failed to export finance CSV", err);
    }
  };

  if (!isAuthorized) {
    return (
      <View style={[styles.root, styles.center, { padding: s(24) }]}>
        <Ionicons name="lock-closed-outline" size={s(64)} color={theme.colors.error} style={{ marginBottom: s(16) }} />
        <Text style={{ fontSize: s(22), fontWeight: "900", color: theme.colors.textPrimary, marginBottom: s(8), textAlign: "center" }}>
          {UI_TEXT.accessDeniedTitle}
        </Text>
        <Text style={{ fontSize: s(14), color: theme.colors.textMuted, textAlign: "center", marginBottom: s(24), lineHeight: s(20) }}>
          {UI_TEXT.accessDeniedMessage}
        </Text>
        <Pressable
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={UI_TEXT.goBack}
          onPress={() => goBack()}
          style={({ pressed }) => [
            { backgroundColor: theme.colors.primary, paddingHorizontal: s(24), paddingVertical: s(12), borderRadius: s(8) },
            pressed && { opacity: 0.8 }
          ]}
        >
          <Text style={{ color: theme.colors.white, fontWeight: "800", fontSize: s(15) }}>{UI_TEXT.goBack}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle={themeType === AppThemeMode.DARK ? "light-content" : "dark-content"} />

      {/* Navigation Header */}
      <View style={[styles.header, { paddingBottom: s(16) }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", height: 40, marginBottom: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <BackButton onPress={goBack} />
            <HomeButton onPress={() => navigate(AppScreen.HOME)} />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <ThemeToggleButton />
            <LogoutButton onLogout={handleLogout} />
          </View>
        </View>
        <UserGreeting />
      </View>

      <ScrollView style={{ flex: 1, width: "100%" }} contentContainerStyle={[styles.content, { paddingBottom: s(80) }]}>
        {/* Title Banner */}
        <View style={{ marginBottom: s(20) }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: s(6) }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: s(10) }}>
              <View style={{ backgroundColor: theme.colors.primary + "20", padding: s(10), borderRadius: s(12) }}>
                <Ionicons name="wallet-outline" size={s(24)} color={theme.colors.primary} />
              </View>
              <Text style={{ fontSize: s(22), fontWeight: "900", color: theme.colors.textPrimary }}>
                {UI_TEXT.catererFinanceTitle}
              </Text>
            </View>
            {transactions.length > 0 && (
              <Pressable
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={UI_TEXT.exportCsv}
                onPress={handleExportCsv}
                style={({ pressed }) => [
                  { flexDirection: "row", alignItems: "center", gap: s(6), backgroundColor: theme.colors.surfaceDark, paddingHorizontal: s(12), paddingVertical: s(8), borderRadius: s(8), borderWidth: 1, borderColor: theme.colors.border },
                  pressed && { opacity: 0.7 }
                ]}
              >
                <Ionicons name="download-outline" size={s(16)} color={theme.colors.primary} />
                <Text style={{ fontSize: s(12), fontWeight: "800", color: theme.colors.primary }}>{UI_TEXT.downloadReport}</Text>
              </Pressable>
            )}
          </View>
          <Text style={{ fontSize: s(14), color: theme.colors.textMuted, lineHeight: s(20) }}>
            {UI_TEXT.catererFinanceSubtitle}
          </Text>
        </View>

        {/* Summary Dashboard Cards */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: s(12), marginBottom: s(24) }}>
          {/* Total Income Card */}
          <View style={[styles.card, { flex: 1, minWidth: s(140), backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderLeftWidth: s(4), borderLeftColor: theme.colors.success, padding: s(16), marginBottom: 0 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: s(8), marginBottom: s(8) }}>
              <Ionicons name="arrow-down-circle-outline" size={s(18)} color={theme.colors.success} />
              <Text style={{ fontSize: s(12), fontWeight: "800", color: theme.colors.textMuted }}>{UI_TEXT.totalIncome}</Text>
            </View>
            <Text style={{ fontSize: s(22), fontWeight: "900", color: theme.colors.success }}>
              ₹{totalIncome.toLocaleString()}
            </Text>
          </View>

          {/* Total Expenses Card */}
          <View style={[styles.card, { flex: 1, minWidth: s(140), backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderLeftWidth: s(4), borderLeftColor: theme.colors.error, padding: s(16), marginBottom: 0 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: s(8), marginBottom: s(8) }}>
              <Ionicons name="arrow-up-circle-outline" size={s(18)} color={theme.colors.error} />
              <Text style={{ fontSize: s(12), fontWeight: "800", color: theme.colors.textMuted }}>{UI_TEXT.totalExpenses}</Text>
            </View>
            <Text style={{ fontSize: s(22), fontWeight: "900", color: theme.colors.error }}>
              ₹{totalExpenses.toLocaleString()}
            </Text>
          </View>

          {/* Net Balance Card */}
          <View style={[styles.card, { width: "100%", backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderLeftWidth: s(4), borderLeftColor: netBalance >= 0 ? theme.colors.primary : theme.colors.error, padding: s(16), marginBottom: 0 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: s(12) }}>
              <View>
                <Text style={{ fontSize: s(12), fontWeight: "800", color: theme.colors.textMuted, marginBottom: s(4) }}>
                  {netBalance >= 0 ? UI_TEXT.netProfit : UI_TEXT.netLoss} ({UI_TEXT.netBalance})
                </Text>
                <Text style={{ fontSize: s(26), fontWeight: "900", color: netBalance >= 0 ? theme.colors.success : theme.colors.error }}>
                  ₹{Math.abs(netBalance).toLocaleString()} {netBalance >= 0 ? UI_TEXT.creditLabel : UI_TEXT.deficitLabel}
                </Text>
              </View>
              <Pressable
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={UI_TEXT.addTransaction}
                onPress={() => setShowAddModal(true)}
                style={({ pressed }) => [
                  { flexDirection: "row", alignItems: "center", gap: s(8), backgroundColor: theme.colors.primary, paddingHorizontal: s(16), paddingVertical: s(10), borderRadius: s(8) },
                  pressed && { opacity: 0.8 }
                ]}
              >
                <Ionicons name="add-circle-outline" size={s(18)} color={theme.colors.white} />
                <Text style={{ color: theme.colors.white, fontWeight: "800", fontSize: s(14) }}>{UI_TEXT.addTransaction}</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Category Breakdown Section */}
        {activeCategories.length > 0 && (
          <>
            <Text style={{ fontSize: s(16), fontWeight: "900", color: theme.colors.textPrimary, marginBottom: s(12) }}>
              Category Breakdown
            </Text>
            <View style={{ gap: s(10), marginBottom: s(24) }}>
              {activeCategories.map(([key, cat]) => (
                <View
                  key={key}
                  style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, padding: s(14), flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: s(12), flex: 1 }}>
                    <View style={{ backgroundColor: (cat.type === "income" ? theme.colors.success : theme.colors.error) + "15", padding: s(8), borderRadius: s(8) }}>
                      <Ionicons name={cat.icon as any} size={s(20)} color={cat.type === "income" ? theme.colors.success : theme.colors.error} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: s(14), fontWeight: "800", color: theme.colors.textPrimary }} numberOfLines={1}>
                        {cat.label}
                      </Text>
                      <Text style={{ fontSize: s(11), color: theme.colors.textMuted, fontWeight: "600" }}>
                        {cat.type === "income" ? UI_TEXT.incomeCategoryLabel : UI_TEXT.expenseCategoryLabel}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: s(16), fontWeight: "900", color: cat.type === "income" ? theme.colors.success : theme.colors.error }}>
                    {cat.type === "income" ? "+" : "-"}₹{cat.total.toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Transactions Log Section */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: s(12) }}>
          <Text style={{ fontSize: s(16), fontWeight: "900", color: theme.colors.textPrimary }}>
            Transaction History ({transactions.length})
          </Text>
        </View>

        {transactions.length === 0 ? (
          <View style={[styles.card, { padding: s(36), alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: s(16) }]}>
            <View style={{ backgroundColor: theme.colors.primary + "15", padding: s(16), borderRadius: s(32), marginBottom: s(16) }}>
              <Ionicons name="receipt-outline" size={s(40)} color={theme.colors.primary} />
            </View>
            <Text style={{ fontSize: s(16), fontWeight: "800", color: theme.colors.textPrimary, textAlign: "center", marginBottom: s(6) }}>
              {UI_TEXT.noTransactionsRecorded}
            </Text>
            <Text style={{ fontSize: s(13), color: theme.colors.textMuted, textAlign: "center", marginBottom: s(20), maxWidth: s(280), lineHeight: s(18) }}>
              {UI_TEXT.noTransactionsSubtitle}
            </Text>
            <Pressable
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={UI_TEXT.addTransaction}
              onPress={() => setShowAddModal(true)}
              style={({ pressed }) => [
                { flexDirection: "row", alignItems: "center", gap: s(8), backgroundColor: theme.colors.primary, paddingHorizontal: s(20), paddingVertical: s(12), borderRadius: s(8) },
                pressed && { opacity: 0.8 }
              ]}
            >
              <Ionicons name="add-circle-outline" size={s(20)} color={theme.colors.white} />
              <Text style={{ color: theme.colors.white, fontWeight: "800", fontSize: s(14) }}>{UI_TEXT.addTransaction}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: s(10) }}>
            {transactions.map((tx) => {
              const isInc = tx.type === "income";
              const catInfo = categorySummary[tx.category] || { label: tx.category, icon: "receipt-outline" };
              return (
                <View
                  key={tx.id}
                  style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, padding: s(14), flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: s(12), flex: 1, marginRight: s(12) }}>
                    <View style={{ backgroundColor: (isInc ? theme.colors.success : theme.colors.error) + "15", padding: s(8), borderRadius: s(8) }}>
                      <Ionicons name={catInfo.icon as any} size={s(20)} color={isInc ? theme.colors.success : theme.colors.error} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: s(14), fontWeight: "800", color: theme.colors.textPrimary }} numberOfLines={1}>
                        {tx.description}
                      </Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: s(8), marginTop: s(2) }}>
                        <Text style={{ fontSize: s(11), color: theme.colors.primary, fontWeight: "700" }}>{catInfo.label}</Text>
                        <Text style={{ fontSize: s(10), color: theme.colors.textMuted }}>• {new Date(tx.date).toLocaleDateString([], { month: "short", day: "numeric" })}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={{ alignItems: "flex-end", gap: s(4) }}>
                    <Text style={{ fontSize: s(16), fontWeight: "900", color: isInc ? theme.colors.success : theme.colors.error }}>
                      {isInc ? "+" : "-"}₹{tx.amount.toLocaleString()}
                    </Text>
                    <Pressable
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel={UI_TEXT.deleteTransaction}
                      onPress={() => handleDeleteTransaction(tx.id)}
                      style={({ pressed }) => [{ padding: s(4) }, pressed && { opacity: 0.6 }]}
                    >
                      <Ionicons name="trash-outline" size={s(16)} color={theme.colors.error} />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Add Transaction Modal */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: s(20) }}>
          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, padding: s(20), borderRadius: s(16) }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: s(16) }}>
              <Text style={{ fontSize: s(18), fontWeight: "900", color: theme.colors.textPrimary }}>
                {UI_TEXT.addTransaction}
              </Text>
              <Pressable
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={UI_TEXT.closeParen || "Close"}
                onPress={() => setShowAddModal(false)}
              >
                <Ionicons name="close-outline" size={s(24)} color={theme.colors.textPrimary} />
              </Pressable>
            </View>

            {/* Type Selector */}
            <Text style={{ fontSize: s(12), fontWeight: "800", color: theme.colors.textMuted, marginBottom: s(6) }}>
              {UI_TEXT.transactionType}
            </Text>
            <View style={{ flexDirection: "row", gap: s(10), marginBottom: s(16) }}>
              <Pressable
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={UI_TEXT.expenseTransaction}
                onPress={() => {
                  setTxType("expense");
                  setTxCategory(CatererFinanceCategory.RAW_MATERIALS);
                }}
                style={({ pressed }) => [
                  { flex: 1, paddingVertical: s(10), borderRadius: s(8), alignItems: "center", backgroundColor: txType === "expense" ? theme.colors.error : theme.colors.surfaceDark, borderWidth: 1, borderColor: txType === "expense" ? theme.colors.error : theme.colors.border },
                  pressed && { opacity: 0.8 }
                ]}
              >
                <Text style={{ color: txType === "expense" ? theme.colors.white : theme.colors.textPrimary, fontWeight: "800", fontSize: s(13) }}>{UI_TEXT.expense}</Text>
              </Pressable>
              <Pressable
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={UI_TEXT.incomeTransaction}
                onPress={() => {
                  setTxType("income");
                  setTxCategory(CatererFinanceCategory.ORGANIZER_PAYMENTS);
                }}
                style={({ pressed }) => [
                  { flex: 1, paddingVertical: s(10), borderRadius: s(8), alignItems: "center", backgroundColor: txType === "income" ? theme.colors.success : theme.colors.surfaceDark, borderWidth: 1, borderColor: txType === "income" ? theme.colors.success : theme.colors.border },
                  pressed && { opacity: 0.8 }
                ]}
              >
                <Text style={{ color: txType === "income" ? theme.colors.white : theme.colors.textPrimary, fontWeight: "800", fontSize: s(13) }}>{UI_TEXT.income}</Text>
              </Pressable>
            </View>

            {/* Category Selector */}
            <View style={{ marginBottom: s(16) }}>
              <Dropdown
                label={UI_TEXT.category}
                value={CATEGORY_LABEL_MAP[txCategory] || txCategory}
                options={txType === "expense" ? expenseOptions : incomeOptions}
                onChange={(selectedLabel) => {
                  const cat = CATEGORY_FROM_LABEL[selectedLabel];
                  if (cat) setTxCategory(cat);
                }}
              />
            </View>

            {/* Amount */}
            <Text style={{ fontSize: s(12), fontWeight: "800", color: theme.colors.textMuted, marginBottom: s(6) }}>
              {UI_TEXT.amountInr}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.surfaceDark, color: theme.colors.textPrimary, marginBottom: s(16), borderColor: theme.colors.border, borderWidth: 1, borderRadius: s(8), paddingHorizontal: s(12), paddingVertical: s(10), fontSize: s(15) }]}
              placeholder={UI_TEXT.amountPlaceholder}
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="numeric"
              value={txAmount}
              onChangeText={setTxAmount}
              accessibilityLabel={UI_TEXT.amountInr}
            />

            {/* Description */}
            <Text style={{ fontSize: s(12), fontWeight: "800", color: theme.colors.textMuted, marginBottom: s(6) }}>
              {UI_TEXT.description}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.surfaceDark, color: theme.colors.textPrimary, marginBottom: s(20), borderColor: theme.colors.border, borderWidth: 1, borderRadius: s(8), paddingHorizontal: s(12), paddingVertical: s(10), fontSize: s(15) }]}
              placeholder={UI_TEXT.descriptionPlaceholder}
              placeholderTextColor={theme.colors.textMuted}
              value={txDescription}
              onChangeText={setTxDescription}
              accessibilityLabel={UI_TEXT.description}
            />

            {/* Save Button */}
            <Pressable
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={UI_TEXT.saveTransaction}
              onPress={handleAddTransaction}
              style={({ pressed }) => [
                { backgroundColor: theme.colors.primary, paddingVertical: s(14), borderRadius: s(8), alignItems: "center" },
                pressed && { opacity: 0.8 }
              ]}
            >
              <Text style={{ color: theme.colors.white, fontWeight: "900", fontSize: s(15) }}>
                {UI_TEXT.saveTransaction}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
