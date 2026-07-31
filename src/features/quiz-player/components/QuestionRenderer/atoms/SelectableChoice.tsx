import React from 'react';

interface SelectableChoiceProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-pressed'> {
  selected: boolean;
}

const SelectableChoice: React.FC<SelectableChoiceProps> = ({
  selected,
  className = '',
  children,
  type = 'button',
  ...props
}) => (
  <button
    {...props}
    type={type}
    aria-pressed={selected}
    className={[
      'group min-h-11 border border-transparent bg-white text-slate-700 shadow-sm',
      'transition-[transform,background-color,color,box-shadow] duration-150',
      'hover:bg-sky-50/70 hover:shadow-md active:scale-[0.985]',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2',
      'motion-reduce:transform-none motion-reduce:transition-none',
      selected ? 'bg-emerald-50 text-emerald-950 shadow-sm ring-1 ring-inset ring-emerald-300' : '',
      className,
    ].join(' ')}
  >
    {children}
  </button>
);

export default SelectableChoice;
