import { useEffect, useRef, useState } from 'react';
import { Menu as MenuIcon, Minus, Square, Copy, X } from 'lucide-react';
import { Icon } from './Icon';

const TITLE_BAR_HEIGHT = 32;
const MAC_TRAFFIC_LIGHT_RESERVE = 80;

interface TitleBarButtonProps {
  label: string;
  onClick: () => void;
  intent?: 'default' | 'danger';
  children: React.ReactNode;
}

function TitleBarButton({
  label,
  onClick,
  intent = 'default',
  children,
}: TitleBarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`app-region-no-drag flex items-center justify-center w-[44px] h-full text-text-muted transition-colors duration-fast cursor-pointer focus-visible:outline-none ${
        intent === 'danger'
          ? 'hover:bg-accent-red hover:text-white'
          : 'hover:bg-app-hover hover:text-text-primary'
      }`}
    >
      {children}
    </button>
  );
}

export function TitleBar() {
  const isMac = window.api.platform === 'darwin';
  const [appName, setAppName] = useState('');
  const [isMaximized, setIsMaximized] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    window.api.appGetInfo().then((info) => {
      if (!cancelled) setAppName(info.name);
    });
    window.api.windowIsMaximized().then((res) => {
      if (!cancelled) setIsMaximized(res.isMaximized);
    });
    const off = window.api.onWindowMaximizeChange((event) => {
      setIsMaximized(event.isMaximized);
    });
    return () => {
      cancelled = true;
      off();
    };
  }, []);

  const openWindowMenu = () => {
    const rect = menuButtonRef.current?.getBoundingClientRect();
    if (rect) {
      void window.api.menuShowWindowMenu({
        x: Math.round(rect.left),
        y: Math.round(rect.bottom),
      });
    } else {
      void window.api.menuShowWindowMenu();
    }
  };

  return (
    <div
      style={{ height: TITLE_BAR_HEIGHT }}
      className="app-region-drag flex items-center bg-app-deep text-text-secondary shrink-0 select-none"
    >
      {isMac ? (
        <div style={{ width: MAC_TRAFFIC_LIGHT_RESERVE }} />
      ) : (
        <button
          ref={menuButtonRef}
          type="button"
          aria-label="Application menu"
          title="Menu"
          onClick={openWindowMenu}
          className="app-region-no-drag flex items-center justify-center w-[40px] h-full text-text-muted hover:bg-app-hover hover:text-text-primary transition-colors duration-fast cursor-pointer focus-visible:outline-none"
        >
          <Icon icon={MenuIcon} size={14} />
        </button>
      )}

      <div
        className="flex-1 flex items-center text-text-muted px-2"
        style={{ fontSize: 12 }}
      >
        {appName}
      </div>

      {!isMac && (
        <div className="app-region-no-drag flex items-stretch h-full">
          <TitleBarButton label="Minimize" onClick={() => window.api.windowMinimize()}>
            <Icon icon={Minus} size={14} />
          </TitleBarButton>
          <TitleBarButton
            label={isMaximized ? 'Restore' : 'Maximize'}
            onClick={() => window.api.windowMaximize()}
          >
            <Icon icon={isMaximized ? Copy : Square} size={12} />
          </TitleBarButton>
          <TitleBarButton
            label="Close"
            intent="danger"
            onClick={() => window.api.windowClose()}
          >
            <Icon icon={X} size={14} />
          </TitleBarButton>
        </div>
      )}
    </div>
  );
}
