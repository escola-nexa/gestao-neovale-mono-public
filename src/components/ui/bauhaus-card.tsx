import React, { useEffect, useRef } from 'react';
import { MoreVertical } from 'lucide-react';
import { ChronicleButton } from './chronicle-button';

const STYLES = `
.bauhaus-card {
  position: relative;
  width: 100%;
  min-height: 19rem;
  display: block;
  text-align: left;
  border-radius: var(--card-radius, 1.5rem);
  border: var(--card-border-width, 2px) solid transparent;
  --rotation: 4.2rad;
  background-image:
    linear-gradient(var(--card-bg, #1B1E2C), var(--card-bg, #1B1E2C)),
    linear-gradient(calc(var(--rotation,4.2rad)), var(--card-accent, #FFDA45) 0, var(--card-bg, #1B1E2C) 30%, transparent 80%);
  background-origin: border-box;
  background-clip: padding-box, border-box;
  color: var(--card-text-main, #f0f0f1);
  box-shadow: 0 12px 28px -12px rgba(0,0,0,0.55);
  overflow: hidden;
}
.bauhaus-card-header {
  position: absolute; top: 0; left: 0; right: 0;
  display: flex; align-items: center; justify-content: space-between;
  padding: 1em 1.25em 0;
}
.bauhaus-date {
  color: var(--card-text-top, #FFDA45);
  font-size: 0.7rem; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase;
}
.bauhaus-more {
  display: inline-flex; align-items: center; justify-content: center;
  width: 1.75rem; height: 1.75rem; border-radius: 9999px;
  background: rgba(255,255,255,0.06); color: var(--card-text-top, #FFDA45);
  cursor: pointer; border: none;
}
.bauhaus-more:hover { background: rgba(255,218,69,0.15); }
.bauhaus-card-body {
  position: absolute; top: 50%; left: 0; right: 0;
  transform: translateY(-50%);
  padding: 0.5em 1.5em;
}
.bauhaus-card-body h3 {
  font-size: 1.15rem; font-weight: 700; line-height: 1.2;
  margin: 0 0 0.25em 0;
  color: var(--card-text-main, #f0f0f1);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.bauhaus-card-body p {
  color: var(--card-text-sub, #a0a1b3);
  font-size: 0.85rem; margin: 0;
  display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;
}
.bauhaus-progress { margin-top: 1rem; }
.bauhaus-progress-bar {
  position: relative; width: 100%; height: 5px;
  background: var(--card-progress-bar-bg, #363636);
  display: block; border-radius: 9999px; overflow: hidden;
}
.bauhaus-progress-bar > div { height: 5px; border-radius: 9999px; background: var(--card-accent, #FFDA45); }
.bauhaus-progress span:first-of-type {
  display: block; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
  margin-bottom: 0.4rem; color: var(--card-text-progress-label, #b4c7e7);
}
.bauhaus-progress span:last-of-type {
  display: block; margin-top: 0.4rem; text-align: right; font-size: 0.75rem; font-weight: 600;
  color: var(--card-text-progress-value, #e7e7f7);
}
.bauhaus-card-footer {
  position: absolute; bottom: 0; left: 0; right: 0;
  display: flex; justify-content: center; align-items: center;
  padding: 0.75em 1em;
  border-top: 1px solid var(--card-separator, #2F2B2A);
}
.bauhaus-button-container {
  display: flex; gap: 10px; justify-content: center;
}
`;

function injectStyles() {
  if (typeof window === 'undefined') return;
  if (!document.getElementById('bauhaus-card-styles')) {
    const style = document.createElement('style');
    style.id = 'bauhaus-card-styles';
    style.innerHTML = STYLES;
    document.head.appendChild(style);
  }
}

export interface BauhausCardProps {
  id: string;
  borderRadius?: string;
  backgroundColor?: string;
  separatorColor?: string;
  accentColor?: string;
  borderWidth?: string;
  topInscription: string;
  mainText: string;
  subMainText: string;
  progressBarInscription: string;
  progress: number;
  progressValue: string;
  filledButtonInscription?: string;
  outlinedButtonInscription?: string;
  onFilledButtonClick: (id: string) => void;
  onOutlinedButtonClick: (id: string) => void;
  onMoreOptionsClick?: (id: string, target: HTMLElement) => void;
  showMoreOptions?: boolean;
  swapButtons?: boolean;
  onCardClick?: (id: string) => void;
  textColorTop?: string;
  textColorMain?: string;
  textColorSub?: string;
  textColorProgressLabel?: string;
  textColorProgressValue?: string;
  progressBarBackground?: string;
  chronicleButtonBg?: string;
  chronicleButtonFg?: string;
  chronicleButtonHoverFg?: string;
  chronicleButtonHoverColor?: string;
}

export const BauhausCard: React.FC<BauhausCardProps> = ({
  id,
  borderRadius = '1.5rem',
  backgroundColor = '#1B1E2C',
  separatorColor = 'rgba(255,218,69,0.25)',
  accentColor = '#FFDA45',
  borderWidth = '2px',
  topInscription,
  mainText,
  subMainText,
  progressBarInscription,
  progress,
  progressValue,
  filledButtonInscription = 'Abrir',
  outlinedButtonInscription = 'Compartilhar',
  onFilledButtonClick,
  onOutlinedButtonClick,
  onMoreOptionsClick,
  showMoreOptions = false,
  swapButtons = false,
  onCardClick,
  textColorTop = '#FFDA45',
  textColorMain = '#FFFFFF',
  textColorSub = 'rgba(255,255,255,0.7)',
  textColorProgressLabel = 'rgba(255,255,255,0.6)',
  textColorProgressValue = '#FFDA45',
  progressBarBackground = 'rgba(255,255,255,0.12)',
  chronicleButtonBg = '#FFDA45',
  chronicleButtonFg = '#1B1E2C',
  chronicleButtonHoverFg = '#1B1E2C',
  chronicleButtonHoverColor = '#FFE680',
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    injectStyles();
    const card = cardRef.current;
    if (!card) return;
    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      const angle = Math.atan2(-x, y);
      card.style.setProperty('--rotation', angle + 'rad');
    };
    card.addEventListener('mousemove', handleMouseMove);
    return () => card.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const cssVars = {
    '--card-radius': borderRadius,
    '--card-bg': backgroundColor,
    '--card-accent': accentColor,
    '--card-separator': separatorColor,
    '--card-border-width': borderWidth,
    '--card-text-top': textColorTop,
    '--card-text-main': textColorMain,
    '--card-text-sub': textColorSub,
    '--card-text-progress-label': textColorProgressLabel,
    '--card-text-progress-value': textColorProgressValue,
    '--card-progress-bar-bg': progressBarBackground,
  } as React.CSSProperties;

  const filled = (
    <ChronicleButton
      key="f"
      text={filledButtonInscription}
      onClick={(e) => { e.stopPropagation(); onFilledButtonClick(id); }}
      borderRadius={borderRadius}
      hoverColor={chronicleButtonHoverColor}
      customBackground={chronicleButtonBg}
      customForeground={chronicleButtonFg}
      hoverForeground={chronicleButtonHoverFg}
    />
  );
  const outlined = (
    <ChronicleButton
      key="o"
      text={outlinedButtonInscription}
      outlined
      onClick={(e) => { e.stopPropagation(); onOutlinedButtonClick(id); }}
      borderRadius={borderRadius}
      hoverColor={chronicleButtonHoverColor}
      customBackground={chronicleButtonBg}
      customForeground={chronicleButtonFg}
      hoverForeground={chronicleButtonHoverFg}
    />
  );

  return (
    <div
      ref={cardRef}
      className="bauhaus-card"
      style={cssVars}
      role={onCardClick ? 'button' : 'article'}
      tabIndex={onCardClick ? 0 : -1}
      onClick={onCardClick ? () => onCardClick(id) : undefined}
      onKeyDown={onCardClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCardClick(id); } } : undefined}
    >
      <div className="bauhaus-card-header">
        <span className="bauhaus-date">{topInscription}</span>
        {showMoreOptions && onMoreOptionsClick && (
          <button
            type="button"
            className="bauhaus-more"
            aria-label="Mais opções"
            onClick={(e) => { e.stopPropagation(); onMoreOptionsClick(id, e.currentTarget); }}
          >
            <MoreVertical size={16} />
          </button>
        )}
      </div>

      <div className="bauhaus-card-body">
        <h3>{mainText}</h3>
        <p>{subMainText}</p>
        <div className="bauhaus-progress">
          <span>{progressBarInscription}</span>
          <span className="bauhaus-progress-bar">
            <div style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
          </span>
          <span>{progressValue}</span>
        </div>
      </div>

      <div className="bauhaus-card-footer">
        <div className="bauhaus-button-container">
          {swapButtons ? <>{outlined}{filled}</> : <>{filled}{outlined}</>}
        </div>
      </div>
    </div>
  );
};
