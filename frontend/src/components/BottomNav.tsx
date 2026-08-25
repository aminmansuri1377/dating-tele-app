import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

const tabs = [
  { path: "/", icon: "🔥", key: "discovery.title" as const },
  { path: "/matches", icon: "💬", key: "matches.title" as const },
  { path: "/premium", icon: "⭐", key: "premium.title" as const },
  { path: "/settings", icon: "⚙️", key: "settings.title" as const },
];

export default function BottomNav() {
  const { t } = useTranslation();

  return (
    <nav
      className="fixed top-0 inset-x-0 z-50 flex justify-around items-center min-h-16 bg-white/95 dark:bg-surface-darkCard/95 backdrop-blur border-b border-black/5 dark:border-white/10"
      style={{
        paddingTop: "var(--safe-top)",
        paddingLeft: "env(safe-area-inset-left, 0px)",
        paddingRight: "env(safe-area-inset-right, 0px)",
      }}
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center min-w-16 h-16 text-xs gap-0.5 ${
              isActive ? "text-brand" : "text-gray-400"
            }`
          }
        >
          <span className="text-xl">{tab.icon}</span>
          <span>{t(tab.key)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
