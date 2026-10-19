import { Icon } from './Icon';
import { SCREENS, type ScreenDef } from '../screens-registry';

interface SidebarProps {
  activeScreen: string;
  onScreenChange: (screen: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

function NavButton({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={item.label}
      aria-current={active ? 'page' : undefined}
      className={`flex flex-col items-center justify-center w-[44px] h-[44px] rounded-[8px] transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        active ? 'bg-app-active' : 'hover:bg-app-hover'
      }`}
      title={item.label}
    >
      <span className={active ? 'text-accent-light' : 'text-text-muted'}>{item.icon}</span>
      <span
        className={`mt-[1px] ${active ? 'text-accent-light' : 'text-text-dim'}`}
        style={{ fontSize: 8 }}
      >
        {item.label}
      </span>
    </button>
  );
}

function toNavItem(screen: ScreenDef): NavItem {
  return {
    id: screen.id,
    label: screen.label,
    icon: <Icon icon={screen.icon} />,
  };
}

export function Sidebar({ activeScreen, onScreenChange }: SidebarProps) {
  const mainItems = SCREENS.filter((s) => s.section === 'main').map(toNavItem);
  const bottomItems = SCREENS.filter((s) => s.section === 'bottom').map(toNavItem);

  return (
    <nav
      aria-label="Primary"
      className="flex flex-col items-center w-[56px] bg-app-deep py-2 gap-[8px] shrink-0"
      style={{ borderRight: '0.5px solid var(--color-border)' }}
    >
      {mainItems.map((item) => (
        <NavButton
          key={item.id}
          item={item}
          active={activeScreen === item.id}
          onClick={() => onScreenChange(item.id)}
        />
      ))}

      <div className="flex-1" />

      {bottomItems.map((item) => (
        <NavButton
          key={item.id}
          item={item}
          active={activeScreen === item.id}
          onClick={() => onScreenChange(item.id)}
        />
      ))}
    </nav>
  );
}
