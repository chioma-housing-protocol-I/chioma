import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import {
  SearchableSelect,
  type SearchableSelectProps,
  type SelectOption,
} from './SearchableSelect';

const cities: SelectOption[] = [
  'Abuja',
  'Accra',
  'Cape Town',
  'Dakar',
  'Kigali',
  'Lagos',
  'Nairobi',
].map((city) => ({ value: city.toLowerCase(), label: city }));

const manyOptions: SelectOption[] = Array.from(
  { length: 10000 },
  (_, idx) => ({
    value: `unit-${idx + 1}`,
    label: `Unit ${idx + 1}`,
    disabled: idx % 25 === 24,
  }),
);

const properties: SelectOption<{ price: number; beds: number }>[] = [
  { value: 'p1', label: 'Lekki Loft', data: { price: 1200, beds: 2 } },
  { value: 'p2', label: 'Ikoyi Villa', data: { price: 4500, beds: 5 } },
  { value: 'p3', label: 'Yaba Studio', data: { price: 600, beds: 1 } },
];

function Demo<T>({
  options,
  ...rest
}: Omit<SearchableSelectProps<T>, 'value' | 'onChange'>) {
  const [value, setValue] = useState<string | null>(null);
  return (
    <div className="w-72">
      <SearchableSelect<T>
        options={options}
        value={value}
        onChange={(next) => setValue(next)}
        {...rest}
      />
    </div>
  );
}

const meta: Meta<typeof SearchableSelect> = {
  title: 'UI/SearchableSelect',
  component: SearchableSelect,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SearchableSelect>;

export const Default: Story = {
  render: () => <Demo options={cities} placeholder="Select a city" />,
};

export const Virtualized: Story = {
  render: () => <Demo options={manyOptions} placeholder="10,000 units" />,
};

export const CustomRendering: Story = {
  render: () => (
    <Demo
      options={properties}
      placeholder="Select a property"
      renderOption={(option, { selected }) => (
        <span className="flex w-full items-center justify-between">
          <span className={selected ? 'font-semibold' : undefined}>
            {option.label}
          </span>
          <span className="text-xs text-neutral-500">
            {option.data?.beds} bd · ${option.data?.price}/mo
          </span>
        </span>
      )}
      renderValue={(option) => `${option.label} ($${option.data?.price})`}
    />
  ),
};

export const NotSearchable: Story = {
  render: () => <Demo options={cities} searchable={false} />,
};
