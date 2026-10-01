import React, { useMemo, memo } from "react";
import {
  View,
  Text,
  Pressable,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ActivityLog, ActivityModule, ActivityAction, CheckoutSource, GuestCheckoutSource, getPassDisplayLabel } from "../../../domain";
import { UI_TEXT } from "../../../strings";
import { Subscription } from "../../../types";

export const ActivityLogItem = memo(({
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
  const existingPass = isPassEvent && item.targetId ? (subscriptions || []).find(s => s.id === item.targetId || getPassDisplayLabel(s) === item.targetId) : null;
  const isClickable = !!existingPass;

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formattedDescription = useMemo(() => {
    let desc = item.description || "";
    if (desc.includes("{subject}")) {
      const fallback = item.targetId && !item.targetId.startsWith("-") ? item.targetId : "";
      desc = fallback ? desc.replace("{subject}", fallback) : desc.replace(": {subject}", "").replace("{subject}", "").trim();
    }
    if (desc.includes("{id}")) {
      const matchedSub = item.targetId ? (subscriptions || []).find(s => s.id === item.targetId) : null;
      const fallbackId = matchedSub ? getPassDisplayLabel(matchedSub) : (item.targetId && !item.targetId.startsWith("-") ? item.targetId : "");
      desc = fallbackId ? desc.replace("{id}", fallbackId) : desc.replace(" {id}", "").replace("{id}", "").trim();
    }
    return desc;
  }, [item.description, item.targetId, subscriptions]);

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
    <View
      style={[
        styles.card,
        {
          backgroundColor: isError ? theme.colors.error + "10" : colorScheme.bg,
          borderColor: isError ? theme.colors.error : colorScheme.border,
          marginBottom: s(12),
          padding: s(16),
          borderLeftWidth: isError ? 6 : (isClickable ? 4 : 1.5),
          borderLeftColor: isClickable ? theme.colors.primary : (isError ? theme.colors.error : colorScheme.border),
        }
      ]}
    >
      <Pressable
        onPress={() => existingPass && onNavigateToDetails(existingPass.id)}
        disabled={!isClickable}
        accessible={true}
        accessibilityRole={isClickable ? "button" : "none"}
        accessibilityLabel={`${item.module} - ${item.action}. ${formattedDescription}`}
        style={({ pressed }) => [
          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' },
          isClickable && pressed && { opacity: 0.7 }
        ]}
      >
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
                <Text style={{ fontSize: s(11), fontWeight: '900', color: isError ? theme.colors.error : theme.colors.accent }}>{item.module.toUpperCase()}</Text>
             </View>
             <Ionicons name="chevron-forward" size={s(14)} color={theme.colors.border} />
             <Text style={{ fontSize: s(15), fontWeight: '800', color: isError ? theme.colors.error : theme.colors.textPrimary }}>{item.action}</Text>
             {item.targetId && (() => {
               const matchedSub = (subscriptions || []).find(s => s.id === item.targetId);
               const displayTargetId = matchedSub ? getPassDisplayLabel(matchedSub) : item.targetId;

               if (displayTargetId.startsWith("-")) {
                 return null;
               }

               return (
                 <View style={{ backgroundColor: theme.colors.surfaceDark, paddingHorizontal: s(8), paddingVertical: s(4), borderRadius: s(6), borderWidth: 1, borderColor: theme.colors.border }}>
                   <Text style={{ fontSize: s(11), fontWeight: '900', color: theme.colors.secondary }}>{displayTargetId}</Text>
                 </View>
               );
             })()}
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
            <Text style={{ fontSize: s(14), color: isError ? theme.colors.error : theme.colors.textPrimary, lineHeight: s(20), fontWeight: '600' }}>{formattedDescription}</Text>
          </View>

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
      </Pressable>

      {isError && item.stack && (
        <View style={{ marginTop: s(12), marginBottom: s(4) }}>
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
    </View>
  );
});
