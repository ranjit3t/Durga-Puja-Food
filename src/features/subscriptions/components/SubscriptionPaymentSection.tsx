import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Modal, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UI_TEXT } from "../../../strings";
import { PaymentEntry, PaymentMode, AppliedPackageInfo } from "../../../domain";
import { Dropdown } from "../../../components/common/Dropdown";
import { formatCurrencyAmount, formatPaymentDateTime } from "../../../utils/paymentUtils";

interface SubscriptionPaymentSectionProps {
  payments: PaymentEntry[];
  totalAmount: number;
  updatePayment: (index: number, updates: Partial<PaymentEntry>, manual?: boolean) => void;
  removePayment: (index: number) => void;
  addPayment: () => void;
  isAdmin: boolean;
  canEdit: boolean;
  enabledMethods: string[];
  scannerTargetIdx: number | null;
  handleScanTransactionId: (index: number) => void;
  sanitizeAmountText: (text: string) => string;
  theme: any;
  styles: any;
  s: (n: number) => number;
  onOpenApplyPackageModal?: () => void;
  hasApplicablePackages?: boolean;
  isPackageApplied?: boolean;
  appliedPackages?: Record<number, AppliedPackageInfo>;
  lockIdentity?: boolean;
  onViewAppliedPackage?: (pkgId: string) => void;
  getPersonLabel?: (index: number) => string;
  discrepancyDetail?: {
    hasDiscrepancy: boolean;
    type: "deficiency" | "excess" | "none";
    amount: number;
  };
  maxPayments?: number;
}

export const SubscriptionPaymentSection: React.FC<SubscriptionPaymentSectionProps> = ({
  payments,
  totalAmount,
  updatePayment,
  removePayment,
  addPayment,
  isAdmin,
  canEdit,
  enabledMethods,
  scannerTargetIdx,
  handleScanTransactionId,
  sanitizeAmountText,
  theme,
  styles,
  s,
  onOpenApplyPackageModal,
  hasApplicablePackages,
  isPackageApplied,
  appliedPackages,
  lockIdentity,
  onViewAppliedPackage,
  getPersonLabel,
  discrepancyDetail,
  maxPayments = 10,
}) => {
  // Payment Date/Time Editor Modal State
  const [editingTimeIdx, setEditingTimeIdx] = useState<number | null>(null);
  const [dateStr, setDateStr] = useState<string>("");
  const [timeStr, setTimeStr] = useState<string>("");

  const openTimeModal = (idx: number, currentTs?: number) => {
    const tsToUse = currentTs && !isNaN(currentTs) && currentTs > 0 ? currentTs : Date.now();
    const d = new Date(tsToUse);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");

    setDateStr(`${yyyy}-${mm}-${dd}`);
    setTimeStr(`${hh}:${min}`);
    setEditingTimeIdx(idx);
  };

  const saveCustomTime = () => {
    if (editingTimeIdx === null) return;

    const trimmedDate = dateStr.trim();
    const trimmedTime = timeStr.trim();

    if (!trimmedDate || !trimmedTime) {
      Alert.alert(UI_TEXT.error, UI_TEXT.invalidPaymentTimeMsg);
      return;
    }

    const combined = `${trimmedDate}T${trimmedTime}:00`;
    const parsed = new Date(combined);

    if (isNaN(parsed.getTime())) {
      Alert.alert(UI_TEXT.error, UI_TEXT.invalidPaymentTimeMsg);
      return;
    }

    updatePayment(editingTimeIdx, { paymentTime: parsed.getTime() });
    setEditingTimeIdx(null);
  };

  const setTimeToNow = () => {
    if (editingTimeIdx === null) return;
    updatePayment(editingTimeIdx, { paymentTime: Date.now() });
    setEditingTimeIdx(null);
  };

  return (
    <View
      accessible={true}
      accessibilityRole="header"
      accessibilityLabel={`${UI_TEXT.paymentDetails}, ${UI_TEXT.total}: ${formatCurrencyAmount(totalAmount)}`}
      style={[styles.card, { backgroundColor: theme.cardColors[3].bg, borderColor: theme.cardColors[3].border }]}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, marginRight: 8 }}>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit={true}
            style={[styles.sectionTitle, { fontSize: 16, marginBottom: 0, color: theme.cardColors[3].accent }]}
          >
            {UI_TEXT.paymentDetails}
          </Text>
          {isPackageApplied && (
            <Pressable
              onPress={onOpenApplyPackageModal}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={UI_TEXT.packageAppliedMarker}
              style={({ pressed }) => [
                {
                  backgroundColor: theme.colors.successLight,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: theme.colors.success,
                },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={{ fontSize: 9, fontWeight: '900', color: theme.colors.success }}>
                {UI_TEXT.packageAppliedMarker}
              </Text>
            </Pressable>
          )}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {!isPackageApplied && hasApplicablePackages && onOpenApplyPackageModal && (
            <Pressable
              onPress={onOpenApplyPackageModal}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={UI_TEXT.applyPackage}
              style={({ pressed }) => [
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: theme.colors.primary,
                  paddingHorizontal: 8,
                  paddingVertical: 5,
                  borderRadius: 8,
                },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Ionicons name="pricetag-outline" size={13} color={theme.colors.white} />
              <Text style={{ color: theme.colors.white, fontWeight: '800', fontSize: 11 }}>
                {UI_TEXT.applyPackage}
              </Text>
            </Pressable>
          )}

          <View style={[styles.pill, { backgroundColor: theme.cardColors[3].accentLight, flexShrink: 0, minWidth: 45 }]}>
            <Text style={[styles.pillText, { color: theme.cardColors[3].accent }]}>{formatCurrencyAmount(totalAmount)}</Text>
          </View>
        </View>
      </View>

      {/* Auto-populated Discrepancy Banner */}
      {discrepancyDetail && discrepancyDetail.hasDiscrepancy && (
        <View
          style={{
            backgroundColor: discrepancyDetail.type === "deficiency" ? theme.colors.errorLight : theme.colors.primary + "15",
            borderColor: discrepancyDetail.type === "deficiency" ? theme.colors.error : theme.colors.primary,
            borderWidth: 1,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 12,
            marginBottom: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
            <Ionicons
              name={discrepancyDetail.type === "deficiency" ? "warning-outline" : "information-circle-outline"}
              size={18}
              color={discrepancyDetail.type === "deficiency" ? theme.colors.error : theme.colors.primary}
            />
            <Text style={{ fontSize: 13, fontWeight: "900", color: discrepancyDetail.type === "deficiency" ? theme.colors.error : theme.colors.primary }}>
              {discrepancyDetail.type === "deficiency" ? UI_TEXT.deficiency : UI_TEXT.excess}: {formatCurrencyAmount(discrepancyDetail.amount)}
            </Text>
          </View>
        </View>
      )}

      {/* Edit Pass Applied Package Details Section */}
      {isPackageApplied && appliedPackages && Object.keys(appliedPackages).length > 0 && (
        <View
          style={{
            backgroundColor: theme.colors.surfaceDark,
            padding: 12,
            borderRadius: 12,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: theme.colors.border,
            gap: 8,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '800', color: theme.colors.textMuted, textTransform: 'uppercase' }}>
            {UI_TEXT.appliedPackage} ({UI_TEXT.foodPackages})
          </Text>

          {Object.entries(appliedPackages).map(([pIdxStr, pkgInfo]) => {
            const pIdx = Number(pIdxStr);
            const personName = getPersonLabel ? getPersonLabel(pIdx) : `${UI_TEXT.person} ${pIdx + 1}`;

            return (
              <View
                key={pIdxStr}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: theme.colors.surface,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: theme.colors.textPrimary }}>
                  {personName}:
                </Text>

                <Pressable
                  onPress={onOpenApplyPackageModal}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`${UI_TEXT.applyPackage} ${pkgInfo.packageName}`}
                  accessibilityHint="Click to update or change package"
                  style={({ pressed }) => [
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      backgroundColor: theme.colors.primary + '15',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Ionicons name="create-outline" size={14} color={theme.colors.primary} />
                  <Text style={{ fontSize: 12, fontWeight: '900', color: theme.colors.primary, textDecorationLine: 'underline' }}>
                    {pkgInfo.packageName}
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: theme.colors.textSecondary }}>
                    ({formatCurrencyAmount(pkgInfo.packagePrice)})
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      {payments.map((p, idx) => (
        <View key={idx} style={{ marginBottom: idx === payments.length - 1 ? 0 : 24, borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: theme.colors.border, paddingTop: idx === 0 ? 0 : 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: theme.colors.textSecondary }}>{UI_TEXT.paymentNumber}{idx + 1}</Text>
            {idx > 0 && isAdmin && canEdit && (
              <Pressable
                onPress={() => removePayment(idx)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`${UI_TEXT.deleteButton} ${UI_TEXT.paymentNumber}${idx + 1}`}
                accessibilityHint="Removes this payment entry"
              >
                <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
              </Pressable>
            )}
          </View>

          {/* Payment Date & Time Section */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, backgroundColor: theme.colors.surface, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
              <Ionicons name="time-outline" size={15} color={theme.colors.primary} />
              <View>
                <Text style={{ fontSize: 10, fontWeight: '800', color: theme.colors.textMuted, textTransform: 'uppercase' }}>
                  {UI_TEXT.paymentTimeLabel}
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '800', color: p.paymentTime ? theme.colors.textPrimary : theme.colors.primary }}>
                  {p.paymentTime ? formatPaymentDateTime(p.paymentTime) : UI_TEXT.paymentTimeAutoCaptured}
                </Text>
              </View>
            </View>

            {isAdmin && canEdit && (
              <Pressable
                onPress={() => openTimeModal(idx, p.paymentTime)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`${UI_TEXT.editPaymentTime} ${UI_TEXT.paymentNumber}${idx + 1}`}
                accessibilityHint="Click to modify payment date and time"
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: theme.colors.primary + '18',
                    paddingHorizontal: 8,
                    paddingVertical: 5,
                    borderRadius: 6,
                  },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Ionicons name="calendar-outline" size={13} color={theme.colors.primary} />
                <Text style={{ fontSize: 11, fontWeight: '800', color: theme.colors.primary }}>
                  {UI_TEXT.editPaymentTime}
                </Text>
              </Pressable>
            )}
          </View>

          <View style={styles.row}>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>{UI_TEXT.amount}</Text>
              <TextInput
                value={p.amount}
                onChangeText={(rawAmount) => updatePayment(idx, { amount: sanitizeAmountText(rawAmount) }, true)}
                onBlur={() => {
                  if (!p.amount || p.amount.trim() === "" || isNaN(parseFloat(p.amount))) {
                    updatePayment(idx, { amount: UI_TEXT.zero }, true);
                  }
                }}
                keyboardType="decimal-pad"
                inputMode="decimal"
                editable={isAdmin && canEdit}
                returnKeyType="done"
                placeholder={UI_TEXT.zero}
                placeholderTextColor={theme.colors.textMuted}
                accessible={true}
                accessibilityLabel={`${UI_TEXT.paymentNumber}${idx + 1} ${UI_TEXT.amount}`}
                accessibilityHint="Enter payment amount in digits"
                style={[styles.input, !isAdmin && { backgroundColor: theme.colors.surface }]}
              />
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>{UI_TEXT.paymentMode}</Text>
              {isAdmin ? (
                <Dropdown
                  value={p.mode}
                  options={enabledMethods}
                  onChange={(mode) => updatePayment(idx, { mode: mode as any })}
                />
              ) : (
                <View style={[styles.input, { backgroundColor: theme.colors.surface, justifyContent: "center" }]}>
                  <Text style={{ fontSize: 16, fontWeight: "600", color: theme.colors.textPrimary }}>{p.mode}</Text>
                </View>
              )}
            </View>
          </View>

          {(p.mode === PaymentMode.UPI || p.mode === PaymentMode.BANK_TRANSFER) && (
            <View style={{ marginTop: 16 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <Text style={[styles.label, { marginBottom: 0 }]}>{UI_TEXT.transactionIdLabel}</Text>
                {isAdmin && canEdit && (
                  <Pressable
                    onPress={() => handleScanTransactionId(idx)}
                    disabled={scannerTargetIdx === idx}
                    style={({ pressed }) => [
                      {
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        backgroundColor: theme.colors.primary + "18",
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 6,
                      },
                      pressed && { opacity: 0.7 }
                    ]}
                  >
                    <Ionicons name="scan-outline" size={14} color={theme.colors.primary} />
                    <Text style={{ fontSize: 11, fontWeight: "800", color: theme.colors.primary }}>{UI_TEXT.scanTransactionId}</Text>
                  </Pressable>
                )}
              </View>
              <TextInput
                value={p.transactionId || ""}
                onChangeText={(txId) => updatePayment(idx, { transactionId: txId })}
                placeholder={UI_TEXT.transactionIdPlaceholder}
                placeholderTextColor={theme.colors.textMuted}
                editable={isAdmin && canEdit}
                style={[styles.input, !isAdmin && { backgroundColor: theme.colors.surface }]}
              />
            </View>
          )}

          {p.mode === PaymentMode.CASH && (
            <View style={{ marginTop: 16 }}>
              <Text style={styles.label}>{UI_TEXT.receivedByLabel}</Text>
              <TextInput
                value={p.receivedBy || ""}
                onChangeText={(collector) => updatePayment(idx, { receivedBy: collector })}
                placeholder={UI_TEXT.receivedByPlaceholder}
                placeholderTextColor={theme.colors.textMuted}
                editable={isAdmin && canEdit}
                style={[styles.input, !isAdmin && { backgroundColor: theme.colors.surface }]}
              />
            </View>
          )}
        </View>
      ))}

      {isAdmin && canEdit && payments.length < maxPayments && (
        <Pressable
          onPress={addPayment}
          style={({ pressed }) => [
            styles.secondary,
            { marginTop: 16, height: 46, borderRadius: 12, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
            pressed && { opacity: 0.7 }
          ]}
        >
          <Ionicons name="add-circle-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.secondaryText}>{UI_TEXT.addAnotherPayment}</Text>
        </Pressable>
      )}

      {/* Edit Payment Time Modal */}
      <Modal
        visible={editingTimeIdx !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditingTimeIdx(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderWidth: 1,
              borderRadius: 16,
              padding: 20,
              gap: 16,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
                <Text style={{ fontSize: 16, fontWeight: "900", color: theme.colors.textPrimary }}>
                  {UI_TEXT.editPaymentTimeTitle}
                </Text>
              </View>
              <Pressable
                onPress={() => setEditingTimeIdx(null)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={UI_TEXT.closeParen || "Close"}
              >
                <Ionicons name="close-outline" size={24} color={theme.colors.textMuted} />
              </Pressable>
            </View>

            <Text style={{ fontSize: 12, color: theme.colors.textSecondary, lineHeight: 16 }}>
              {UI_TEXT.editPaymentTimeHelp}
            </Text>

            {/* Set To Current Time Quick Action */}
            <Pressable
              onPress={setTimeToNow}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={UI_TEXT.setCurrentTime}
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  backgroundColor: theme.colors.primary + "18",
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: theme.colors.primary + "40",
                },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Ionicons name="time-outline" size={16} color={theme.colors.primary} />
              <Text style={{ fontSize: 13, fontWeight: "800", color: theme.colors.primary }}>
                {UI_TEXT.setCurrentTime}
              </Text>
            </Pressable>

            <View style={{ height: 1, backgroundColor: theme.colors.border }} />

            {/* Custom Date & Time Inputs */}
            <View style={{ gap: 12 }}>
              <View>
                <Text style={{ fontSize: 12, fontWeight: "800", color: theme.colors.textSecondary, marginBottom: 6 }}>
                  {UI_TEXT.paymentDateLabel}
                </Text>
                <TextInput
                  value={dateStr}
                  onChangeText={setDateStr}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="numbers-and-punctuation"
                  style={{
                    backgroundColor: theme.colors.surfaceDark,
                    color: theme.colors.textPrimary,
                    borderColor: theme.colors.border,
                    borderWidth: 1,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 14,
                    fontWeight: "600",
                  }}
                />
              </View>

              <View>
                <Text style={{ fontSize: 12, fontWeight: "800", color: theme.colors.textSecondary, marginBottom: 6 }}>
                  {UI_TEXT.paymentTimeHoursLabel}
                </Text>
                <TextInput
                  value={timeStr}
                  onChangeText={setTimeStr}
                  placeholder="HH:MM (e.g. 14:30)"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="numbers-and-punctuation"
                  style={{
                    backgroundColor: theme.colors.surfaceDark,
                    color: theme.colors.textPrimary,
                    borderColor: theme.colors.border,
                    borderWidth: 1,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 14,
                    fontWeight: "600",
                  }}
                />
              </View>
            </View>

            {/* Modal Actions */}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
              <Pressable
                onPress={() => setEditingTimeIdx(null)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={UI_TEXT.cancel || "Cancel"}
                style={({ pressed }) => [
                  {
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 10,
                    alignItems: "center",
                    backgroundColor: theme.colors.surfaceDark,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={{ color: theme.colors.textPrimary, fontWeight: "800", fontSize: 13 }}>
                  {UI_TEXT.cancel || "Cancel"}
                </Text>
              </Pressable>

              <Pressable
                onPress={saveCustomTime}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={UI_TEXT.savePaymentTime}
                style={({ pressed }) => [
                  {
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 10,
                    alignItems: "center",
                    backgroundColor: theme.colors.primary,
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={{ color: theme.colors.white, fontWeight: "800", fontSize: 13 }}>
                  {UI_TEXT.savePaymentTime}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};
