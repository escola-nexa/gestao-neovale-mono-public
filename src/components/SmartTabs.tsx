import React, { Children, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface SmartTabsProps {
  /** Tab definitions: value, label, icon, badge, content, hidden */
  tabs: {
    value: string;
    label: string;
    shortLabel?: string;
    icon?: React.ReactNode;
    badge?: React.ReactNode;
    content: React.ReactNode;
    /** When true, this tab is completely hidden */
    hidden?: boolean;
  }[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  tabsListClassName?: string;
  triggerClassName?: string;
}

/**
 * SmartTabs: hides TabsList when only 1 visible tab exists,
 * rendering content directly instead.
 */
export function SmartTabs({
  tabs,
  defaultValue,
  value,
  onValueChange,
  className = 'space-y-4',
  tabsListClassName,
  triggerClassName,
}: SmartTabsProps) {
  const visibleTabs = useMemo(() => tabs.filter(t => !t.hidden), [tabs]);

  // Single tab: render content directly without tab chrome
  if (visibleTabs.length === 1) {
    return <div className={className}>{visibleTabs[0].content}</div>;
  }

  // No tabs: nothing to render
  if (visibleTabs.length === 0) return null;

  const resolvedDefault = defaultValue || visibleTabs[0].value;

  return (
    <Tabs defaultValue={resolvedDefault} value={value} onValueChange={onValueChange} className={className}>
      <TabsList className={tabsListClassName}>
        {visibleTabs.map(tab => (
          <TabsTrigger key={tab.value} value={tab.value} className={triggerClassName}>
            {tab.icon}
            {tab.shortLabel ? (
              <>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
              </>
            ) : (
              tab.label
            )}
            {tab.badge}
          </TabsTrigger>
        ))}
      </TabsList>
      {visibleTabs.map(tab => (
        <TabsContent key={tab.value} value={tab.value} className="space-y-4">
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
