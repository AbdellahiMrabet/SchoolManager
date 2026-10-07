import React from 'react';
import Select from 'react-select';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  isClearable?: boolean;
  noOptionsMessage?: string;
}

const customStyles = {
  control: (provided: any) => ({
    ...provided,
    minHeight: '38px',
    borderColor: '#e2e8f0',
    boxShadow: 'none',
    '&:hover': { borderColor: '#2a6df4' },
  }),
  option: (provided: any, state: any) => ({
    ...provided,
    backgroundColor: state.isFocused ? '#f1f5f9' : 'white',
    color: '#1e293b',
    cursor: 'pointer',
  }),
};

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'اختر...',
  isClearable = true,
  noOptionsMessage = 'لا توجد نتائج',
}) => {
  const selectedOption = options.find(o => o.value === value) || null;

  return (
    <Select
      value={selectedOption}
      onChange={(option) => onChange(option ? (option as Option).value : '')}
      options={options}
      placeholder={placeholder}
      isClearable={isClearable}
      noOptionsMessage={() => noOptionsMessage}
      styles={customStyles}
    />
  );
};
