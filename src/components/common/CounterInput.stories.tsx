import React, { useState } from "react";
import { CounterInput } from "./CounterInput";

const defaultArgs = {
  label: "Meal",
  description: "Lunch",
  min: 0,
  max: 10,
};

export default {
  title: "Common/CounterInput",
  component: CounterInput,
  args: defaultArgs,
};

const renderCounterInput = (args: React.ComponentProps<typeof CounterInput>) => {
  const [value, setValue] = useState(2);
  return <CounterInput {...args} value={value} onChange={setValue} />;
};

export const Standard = {
  render: renderCounterInput,
};

export const Compact = {
  render: renderCounterInput,
  args: {
    ...defaultArgs,
    compact: true,
  },
};