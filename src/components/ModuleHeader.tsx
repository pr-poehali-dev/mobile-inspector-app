import Icon from "@/components/ui/icon";

interface Props {
  title: string;
  subtitle?: string;
  onBack: () => void;
  icon?: string;
  iconColor?: string;
}

export default function ModuleHeader({ title, subtitle, onBack, icon, iconColor }: Props) {
  return (
    <div className="glass border-b border-white/10 px-4 py-4 sticky top-0 z-20">
      <div className="flex items-center gap-3 max-w-2xl mx-auto">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-white/10 transition-colors flex-shrink-0">
          <Icon name="ArrowLeft" size={20} color="white" />
        </button>
        {icon && (
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${iconColor}20`, border: `1px solid ${iconColor}30` }}>
            <Icon name={icon} size={18} color={iconColor || "white"} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-white truncate">{title}</h1>
          {subtitle && <p className="text-xs text-white/40">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
