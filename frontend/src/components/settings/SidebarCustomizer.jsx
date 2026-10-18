import { Icon } from "@/components/icons";
import { Button, IconButton, Switch } from "@/components/ui";
import { NAV_BY_ID } from "@/constants/navigation";
import { usePreferences } from "@/context/PreferencesContext";
import { cn } from "@/utils/cn";

export function SidebarCustomizer() {
  const { nav, setVisible, move, resetNav } = usePreferences();
  const visibleCount = nav.order.length - nav.hidden.length;

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y divide-line rounded-lg border border-line">
        {nav.order.map((id, index) => {
          const item = NAV_BY_ID[id];
          const visible = !nav.hidden.includes(id);
          const lastVisible = visible && visibleCount === 1;
          const descId = `nav-desc-${id}`;
          return (
            <li key={id} className="flex items-center gap-3 px-3 py-2">
              <Icon name={item.icon} className={cn("h-[18px] w-[18px] shrink-0", visible ? "text-ink" : "text-ink-subtlest")} />
              <div className="min-w-0 flex-1">
                <p className={cn("truncate text-sm", visible ? "text-ink" : "text-ink-subtle")}>{item.label}</p>
                <p id={descId} className="truncate text-xs text-ink-subtlest">
                  {lastVisible ? "Нужен хотя бы один раздел" : item.description}
                </p>
              </div>
              <div className="flex items-center">
                <IconButton icon="arrowUp" size="sm" label={`Переместить «${item.label}» выше`} disabled={index === 0} onClick={() => move(id, -1)} />
                <IconButton
                  icon="arrowDown"
                  size="sm"
                  label={`Переместить «${item.label}» ниже`}
                  disabled={index === nav.order.length - 1}
                  onClick={() => move(id, 1)}
                />
              </div>
              <Switch checked={visible} onChange={(v) => setVisible(id, v)} label={`Показывать «${item.label}» в панели`} describedBy={descId} disabled={lastVisible} />
            </li>
          );
        })}
      </ul>
      <div>
        <Button variant="link" onClick={resetNav}>
          Вернуть по умолчанию
        </Button>
      </div>
    </div>
  );
}
