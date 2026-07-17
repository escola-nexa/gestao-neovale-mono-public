import React from 'react';

const STYLES = `
.chronicleButton {
  --chronicle-button-border-radius: 8px;
  border-radius: var(--chronicle-button-border-radius);
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
  line-height: 1;
  padding: 0.75rem 1.1rem;
  cursor: pointer;
  border: none;
  font-weight: 700;
  font-family: inherit;
  background: var(--chronicle-button-background);
  color: var(--chronicle-button-foreground);
  transition: background 0.4s linear, color 0.4s linear, border-color 0.4s linear;
  position: relative;
}
.chronicleButton:hover {
  background: var(--chronicle-button-hover-background);
  color: var(--chronicle-button-hover-foreground);
}
.chronicleButton span {
  position: relative;
  display: block;
  perspective: 108px;
}
.chronicleButton span:nth-of-type(2) { position: absolute; }
.chronicleButton em {
  font-style: normal;
  display: inline-block;
  font-size: 0.85rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: inherit;
  will-change: transform, opacity, color;
  transition: transform 0.55s cubic-bezier(.645,.045,.355,1), opacity 0.35s linear 0.2s, color 0.4s linear;
}
.chronicleButton span:nth-of-type(1) em { transform-origin: top; }
.chronicleButton span:nth-of-type(2) em {
  opacity: 0;
  transform: rotateX(-90deg) scaleX(.9) translate3d(0,10px,0);
  transform-origin: bottom;
}
.chronicleButton:hover span:nth-of-type(1) em {
  opacity: 0;
  transform: rotateX(90deg) scaleX(.9) translate3d(0,-10px,0);
}
.chronicleButton:hover span:nth-of-type(2) em {
  opacity: 1;
  transform: rotateX(0deg) scaleX(1) translateZ(0);
  transition: transform 0.75s cubic-bezier(.645,.045,.355,1), opacity 0.35s linear 0.3s, color 0.4s linear;
}
.chronicleButton.outlined {
  background: transparent;
  border: 2px solid var(--chronicle-button-background);
  padding: calc(0.75rem - var(--outline-padding-adjustment)) 0;
  color: var(--chronicle-button-background);
}
.chronicleButton.outlined:hover {
  background: var(--outlined-button-background-on-hover, transparent);
  border-color: var(--chronicle-button-hover-background);
  color: var(--chronicle-button-hover-background);
}
.chronicleButton.outlined span:nth-of-type(1) em,
.chronicleButton.outlined span:nth-of-type(2) em { transition: color 0.4s linear; }
.chronicleButton.outlined:hover span:nth-of-type(1) em,
.chronicleButton.outlined:hover span:nth-of-type(2) em { color: var(--chronicle-button-hover-background); }
`;

interface ChronicleButtonProps {
  text: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  hoverColor?: string;
  width?: string;
  outlined?: boolean;
  outlinePaddingAdjustment?: string;
  borderRadius?: string;
  outlinedButtonBackgroundOnHover?: string;
  customBackground?: string;
  customForeground?: string;
  hoverForeground?: string;
}

export const ChronicleButton: React.FC<ChronicleButtonProps> = ({
  text,
  onClick,
  hoverColor = '#FFDA45',
  width = '140px',
  outlined = false,
  outlinePaddingAdjustment = '2px',
  borderRadius = '12px',
  outlinedButtonBackgroundOnHover = 'transparent',
  customBackground = '#FFDA45',
  customForeground = '#1B1E2C',
  hoverForeground = '#1B1E2C',
}) => {
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!document.getElementById('chronicle-button-style')) {
      const style = document.createElement('style');
      style.id = 'chronicle-button-style';
      style.innerHTML = STYLES;
      document.head.appendChild(style);
    }
  }, []);

  const buttonStyle = {
    '--chronicle-button-background': customBackground,
    '--chronicle-button-foreground': customForeground,
    '--chronicle-button-hover-background': hoverColor,
    '--chronicle-button-hover-foreground': hoverForeground,
    '--outline-padding-adjustment': outlinePaddingAdjustment,
    '--chronicle-button-border-radius': borderRadius,
    '--outlined-button-background-on-hover': outlinedButtonBackgroundOnHover,
    width,
    borderRadius,
  } as React.CSSProperties;

  return (
    <button
      type="button"
      className={`chronicleButton${outlined ? ' outlined' : ''}`}
      style={buttonStyle}
      onClick={onClick}
    >
      <span><em>{text}</em></span>
      <span aria-hidden><em>{text}</em></span>
    </button>
  );
};
