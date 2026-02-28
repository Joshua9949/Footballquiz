import { Link, useLocation } from "react-router-dom";
import { Trophy, Users, Brain, Home, Sun, Moon, Monitor, Award } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { motion } from "framer-motion";

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/quiz", label: "Leagues", icon: Trophy },
  { to: "/players", label: "Players", icon: Users },
  { to: "/managers", label: "Managers", icon: Award },
  { to: "/ai-chat", label: "AI Chat", icon: Brain },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const { theme, setTheme } = useTheme();

  const themeOptions = [
    { value: "light" as const, icon: Sun },
    { value: "dark" as const, icon: Moon },
    { value: "system" as const, icon: Monitor },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">⚽</span>
          <span className="text-xl font-bold text-foreground">
            Foot<span className="text-primary">Quiz</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const isActive = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {isActive && (
                  <motion.div
                    layoutId="navbar-indicator"
                    className="absolute inset-0 rounded-lg bg-accent"
                    style={{ zIndex: -1 }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-border p-1">
          {themeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={`rounded-md p-1.5 transition-colors ${
                theme === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label={`${opt.value} theme`}
            >
              <opt.icon className="h-4 w-4" />
            </button>
          ))}
        </div>

        {/* Mobile nav */}
        <div className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-border bg-background/95 backdrop-blur-lg md:hidden">
          {navItems.map((item) => {
            const isActive = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
