import React from "react";
import { View, Text, TextInput, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UI_TEXT } from "../../../strings";
import { Dropdown } from "../../../components/common/Dropdown";
import { CounterInput } from "../../../components/common/CounterInput";

interface SubscriptionBasicInfoSectionProps {
  block: string;
  setBlock: (val: string) => void;
  blockOptions: string[];
  flat: string;
  setFlat: (val: string) => void;
  phone: string;
  setPhone: (val: string) => void;
  peopleCount: number;
  setPeopleCount: (val: number) => void;
  kidsCount: number;
  setKidsCount: (val: number) => void;
  guestsCount?: number;
  setGuestsCount?: (val: number) => void;
  kidsEnabled: boolean;
  guestsEnabled?: boolean;
  mobileEnabled: boolean;
  isAdmin: boolean;
  canEdit: boolean;
  lockIdentity: boolean;
  hasAnyMealTaken: boolean;
  minPeople: number;
  minKids: number;
  minGuests?: number;
  pickContact?: () => void;
  identity1Enabled?: boolean;
  identity1Name?: string;
  identity1Options?: string[];
  identity2Enabled?: boolean;
  identity2Name?: string;
  theme: any;
  styles: any;
  s: (n: number) => number;
}

export const SubscriptionBasicInfoSection: React.FC<SubscriptionBasicInfoSectionProps> = ({
  block,
  setBlock,
  blockOptions,
  flat,
  setFlat,
  phone,
  setPhone,
  peopleCount,
  setPeopleCount,
  kidsCount,
  setKidsCount,
  guestsCount = 0,
  setGuestsCount,
  kidsEnabled,
  guestsEnabled = false,
  mobileEnabled,
  isAdmin,
  canEdit,
  lockIdentity,
  hasAnyMealTaken,
  minPeople,
  minKids,
  minGuests = 0,
  pickContact,
  identity1Enabled,
  identity1Name,
  identity1Options,
  identity2Enabled,
  identity2Name,
  theme,
  styles,
  s,
}) => {
  const id1Enabled = identity1Enabled !== false;
  const id2Enabled = identity2Enabled !== false;
  const id1Label = identity1Name || UI_TEXT.blockNo;
  const id2Label = identity2Name || UI_TEXT.flatNo;
  const resolvedBlockOptions = identity1Options && identity1Options.length > 0 ? identity1Options : blockOptions;

  const renderIdentityFields = () => {
    if (id1Enabled && id2Enabled) {
      return (
        <View style={styles.row}>
          <View style={styles.fieldHalf}>
            <Text style={styles.label}>{id1Label}</Text>
            <Dropdown
              value={block}
              options={resolvedBlockOptions}
              onChange={setBlock}
              disabled={!isAdmin || lockIdentity}
            />
          </View>
          <View style={styles.fieldHalf}>
            <Text style={styles.label}>{id2Label}</Text>
            <TextInput
              value={flat}
              onChangeText={(txt) => setFlat(txt.toUpperCase())}
              placeholder={`Enter ${id2Label}`}
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="default"
              autoCapitalize="characters"
              editable={isAdmin && !lockIdentity}
              accessible={true}
              accessibilityLabel={id2Label}
              style={[styles.input, (!isAdmin || lockIdentity) && { backgroundColor: theme.colors.surface }]}
            />
          </View>
        </View>
      );
    } else if (id1Enabled) {
      return (
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.label}>{id1Label}</Text>
          <Dropdown
            value={block}
            options={resolvedBlockOptions}
            onChange={setBlock}
            disabled={!isAdmin || lockIdentity}
          />
        </View>
      );
    } else if (id2Enabled) {
      return (
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.label}>{id2Label}</Text>
          <TextInput
            value={flat}
            onChangeText={(txt) => setFlat(txt.toUpperCase())}
            placeholder={`Enter ${id2Label}`}
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="default"
            autoCapitalize="characters"
            editable={isAdmin && !lockIdentity}
            accessible={true}
            accessibilityLabel={id2Label}
            style={[styles.input, (!isAdmin || lockIdentity) && { backgroundColor: theme.colors.surface }]}
          />
        </View>
      );
    }
    return null;
  };

  return (
    <View style={[styles.card, { marginTop: 8, backgroundColor: theme.cardColors[1].bg, borderColor: theme.cardColors[1].border }]}>
      <Text style={[styles.sectionTitle, { fontSize: 18, marginBottom: 12, color: theme.cardColors[1].accent }]}>
        {id1Enabled && id2Enabled ? `${id1Label} & ${id2Label}` : (id1Enabled ? id1Label : id2Label)}
      </Text>

      {renderIdentityFields()}

      {isAdmin && mobileEnabled && (
        <>
          <Text style={styles.label}>{UI_TEXT.mobileNo}</Text>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <TextInput
              value={phone}
              onChangeText={(text) => {
                const digits = text.replace(/[^0-9]/g, "").slice(0, 10);
                setPhone(digits);
              }}
              placeholder={UI_TEXT.mobileNoPlaceholder}
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="phone-pad"
              editable={isAdmin && canEdit}
              accessible={true}
              accessibilityLabel={UI_TEXT.mobileNo}
              style={[styles.input, { flex: 1 }, !isAdmin && { backgroundColor: theme.colors.surface }]}
            />
            {Platform.OS !== 'web' && isAdmin && canEdit && pickContact && (
              <Pressable
                onPress={pickContact}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={UI_TEXT.contacts}
                style={{
                  backgroundColor: theme.colors.surfaceDark,
                  height: 56,
                  width: 56,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: theme.colors.border
                }}
              >
                <Ionicons name="person-add-outline" size={24} color={theme.colors.primary} />
              </Pressable>
            )}
          </View>
        </>
      )}

      <View style={{ marginTop: 12 }}>
        <CounterInput
          label={kidsEnabled ? UI_TEXT.adultCount : UI_TEXT.peopleCount}
          value={peopleCount}
          min={minPeople}
          onChange={setPeopleCount}
          disabled={!isAdmin || !canEdit}
        />
      </View>

      {kidsEnabled && (
        <CounterInput
          label={UI_TEXT.kidsCount}
          value={kidsCount}
          min={minKids}
          onChange={setKidsCount}
          disabled={!isAdmin || !canEdit}
        />
      )}

      {guestsEnabled && setGuestsCount && (
        <CounterInput
          label={UI_TEXT.guestsCount}
          value={guestsCount}
          min={minGuests}
          onChange={setGuestsCount}
          disabled={!isAdmin || !canEdit}
        />
      )}
    </View>
  );
};
