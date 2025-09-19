import React from 'react';
import PropTypes from 'prop-types';

const VARIANT_CLASSES = {
  primary:
    'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg hover:shadow-xl hover:scale-105 disabled:hover:scale-100',
  secondary: 'text-white border border-white/20 hover:bg-white/20 hover:border-white/30',
  danger: 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30',
};

/**
 * General purpose control button with consistent styling across the app.
 * @param {object} props - Component props.
 * @param {React.ReactNode} props.children - Button contents.
 * @param {() => void} props.onClick - Click handler.
 * @param {'primary'|'secondary'|'danger'} [props.variant='secondary'] - Visual style variant.
 * @param {boolean} [props.active=false] - Whether the button is in an active/toggled state.
 * @param {boolean} [props.disabled=false] - Whether the button is disabled.
 * @returns {JSX.Element}
 */
export default function ControlButton({
  children,
  onClick,
  variant = 'secondary',
  active = false,
  disabled = false,
}) {
  const baseClasses =
    'flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  const variantClasses = VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.secondary;
  const activeBackground = variant === 'secondary' && active ? 'bg-white/20' : 'bg-white/10';
  const classes =
    variant === 'secondary' ? `${baseClasses} ${activeBackground} ${variantClasses}` : `${baseClasses} ${variantClasses}`;

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={classes}>
      {children}
    </button>
  );
}

ControlButton.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func.isRequired,
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger']),
  active: PropTypes.bool,
  disabled: PropTypes.bool,
};
