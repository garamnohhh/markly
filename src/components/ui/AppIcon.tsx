// Squircle launcher tile (brand-export/app-icon). Used as the "Base root" mark
// in the titlebar breadcrumb. Self-contained gradient tile — same in both themes.
import iconDark from "../../assets/brand/app-icon/markly-appicon-dark.svg";

export function AppIcon({ size = 17 }: { size?: number }) {
  return (
    <img
      src={iconDark}
      width={size}
      height={size}
      alt="Markly"
      style={{ borderRadius: "24%", display: "block" }}
    />
  );
}
