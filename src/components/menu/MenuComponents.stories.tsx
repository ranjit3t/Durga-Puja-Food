import React, { useState } from "react";
import { MealDisplay } from "./MealDisplay";
import { MealMenuEditor } from "./MealMenuEditor";
import { MealSummaryInline } from "./MealSummaryInline";
import { DietType, MealMenu, MealType } from "../../domain";
import { STORY_FIXTURES } from "../../../.storybook/storyMocks";

const noop = () => undefined;
const dayConfig = STORY_FIXTURES.dayConfig as any;
const menu: MealMenu = {
  veg: ["Luchi", "Cholar Dal"],
  nonVeg: ["Fish Curry"],
  vegPrice: "80",
  nonVegPrice: "120",
  vegParcelPrice: "20",
  nonVegParcelPrice: "30",
};

function MenuEditorExample({ special = false, extendedPricing = false, disabled = false }: {
  special?: boolean;
  extendedPricing?: boolean;
  disabled?: boolean;
}) {
  const [value, setValue] = useState(menu);
  const [isDirty, setIsDirty] = useState(false);
  const config = dayConfig.map((day: any) => day.id === "Shashthi"
    ? { ...day, lunch: { ...day.lunch, special, parcel: extendedPricing || day.lunch.parcel, kidsParcel: extendedPricing, guestsParcel: extendedPricing } }
    : day);

  return (
    <MealMenuEditor
      title="Lunch menu"
      mealKey={MealType.LUNCH}
      dayId="Shashthi"
      config={config}
      value={value}
      onChange={(next) => { setValue(next); setIsDirty(true); }}
      onSave={() => setIsDirty(false)}
      isDirty={isDirty}
      disabled={disabled}
      foodPriceEnabled
      kidsEnabled={extendedPricing}
      guestsEnabled={extendedPricing}
    />
  );
}

export default { title: "UI/Menu", parameters: { controls: { disable: true } } };

export const MealDisplayStory = {
  name: "MealDisplay",
  render: () => (
    <MealDisplay
      title="Lunch"
      mealKey={MealType.LUNCH}
      dayId="Shashthi"
      config={dayConfig}
      icon="restaurant-outline"
      menu={menu}
      foodPriceEnabled
      kidsEnabled={false}
      guestsEnabled={false}
    />
  ),
};

export const MealMenuEditorStory = {
  name: "Update Menu/Editable",
  render: () => <MenuEditorExample />,
};

export const MealMenuEditorKidsGuestsStory = {
  name: "Update Menu/KidsAndGuestsPricing",
  render: () => <MenuEditorExample extendedPricing />,
};

export const MealMenuEditorSpecialStory = {
  name: "Update Menu/SpecialMeal",
  render: () => <MenuEditorExample special extendedPricing />,
};

export const MealMenuEditorDisabledStory = {
  name: "Update Menu/ReadOnly",
  render: () => <MenuEditorExample disabled />,
};

export const MealSummaryInlineStory = {
  name: "MealSummaryInline",
  render: () => (
    <MealSummaryInline
      label={DietType.VEG}
      dayId="Shashthi"
      mealKey={MealType.LUNCH}
      config={dayConfig}
      menu={menu}
    />
  ),
};