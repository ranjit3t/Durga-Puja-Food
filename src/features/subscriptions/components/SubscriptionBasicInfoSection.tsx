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
  theme,
  styles,
  s,
}) => {
  return (
    <View style={[styles.card, { marginTop: 8, backgroundColor: theme.cardColors[1].bg, borderColor: theme.cardColors[1].border }]}>
      <Text style={[styles.sectionTitle, { fontSize: 18, marginBottom: 12, color: theme.cardColors[1].accent }]}>
        {UI_TEXT.blockAndFlat}
      </Text>

      <View style={styles.row}>
        <View style={styles.fieldHalf}>
          <Text style={styles.label}>{UI_TEXT.blockNo}</Text>
          <Dropdown
            value={block}
            options={blockOptions}
            onChange={setBlock}
            disabled={!isAdmin || lockIdentity}
          />
        </View>
        <View style={styles.fieldHalf}>
          <Text style={styles.label}>{UI_TEXT.flatNo}</Text>
          <TextInput
            value={flat}
            onChangeText={(txt) => setFlat(txt.toUpperCase())}
            placeholder={UI_TEXT.flatNoPlaceholder}
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="default"
            autoCapitalize="characters"
            editable={isAdmin && !lockIdentity}
            accessible={true}
            accessibilityLabel={UI_TEXT.flatNo}
            style={[styles.input, (!isAdmin || lockIdentity) && { backgroundColor: theme.colors.surface }]}
          />
        </View>
      </View>

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
