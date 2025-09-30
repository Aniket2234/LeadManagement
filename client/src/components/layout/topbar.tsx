import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

interface TopbarProps {
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
  onMenuClick?: () => void;
}

export default function Topbar({ title, subtitle, actions, onMenuClick }: TopbarProps) {
  return (
    <header className="bg-card border-b border-border px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Mobile Menu Button */}
          {onMenuClick && (
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={onMenuClick}
              data-testid="button-mobile-menu"
            >
              <Menu className="h-6 w-6" />
            </Button>
          )}
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">{title}</h2>
            <p className="text-sm sm:text-base text-muted-foreground hidden sm:block">{subtitle}</p>
          </div>
        </div>
        {actions && (
          <div className="flex items-center space-x-2 sm:space-x-4">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
