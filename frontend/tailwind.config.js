const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Atlassian Sans",
          "ui-sans-serif",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Ubuntu",
          "Helvetica Neue",
          "sans-serif",
        ],
      },
      fontSize: {
        "2xs": ["11px", "16px"],
        xs: ["12px", "16px"],
        sm: ["14px", "20px"],
        base: ["16px", "24px"],
        lg: ["20px", "24px"],
        xl: ["24px", "28px"],
        "2xl": ["28px", "32px"],
      },
      colors: {
        surface: {
          DEFAULT: v("surface"),
          sunken: v("surface-sunken"),
          raised: v("surface-raised"),
          overlay: v("surface-overlay"),
          hovered: v("surface-hovered"),
          pressed: v("surface-pressed"),
        },
        neutral: {
          DEFAULT: v("neutral"),
          hover: v("neutral-hover"),
          pressed: v("neutral-pressed"),
        },
        ink: {
          DEFAULT: v("ink"),
          subtle: v("ink-subtle"),
          subtlest: v("ink-subtlest"),
          disabled: v("ink-disabled"),
          inverse: v("ink-inverse"),
          brand: v("ink-brand"),
        },
        brand: {
          DEFAULT: v("brand"),
          hover: v("brand-hover"),
          pressed: v("brand-pressed"),
          subtle: v("brand-subtle"),
        },
        line: {
          DEFAULT: v("line"),
          bold: v("line-bold"),
          focus: v("line-focus"),
        },
        danger: { DEFAULT: v("danger"), subtle: v("danger-subtle"), text: v("danger-text") },
        success: { DEFAULT: v("success"), subtle: v("success-subtle"), text: v("success-text") },
        warning: { DEFAULT: v("warning"), subtle: v("warning-subtle"), text: v("warning-text") },
        discovery: { DEFAULT: v("discovery"), subtle: v("discovery-subtle"), text: v("discovery-text") },
        chart: {
          1: v("chart-1"),
          2: v("chart-2"),
          3: v("chart-3"),
          4: v("chart-4"),
        },
        blanket: "var(--blanket)",
      },
      borderRadius: {
        xs: "2px",
        sm: "4px",
        DEFAULT: "4px",
        md: "6px",
        lg: "8px",
        xl: "12px",
      },
      boxShadow: {
        raised: "var(--shadow-raised)",
        overlay: "var(--shadow-overlay)",
      },
      transitionDuration: {
        instant: "50ms",
        fast: "100ms",
        normal: "150ms",
        slow: "200ms",
        slower: "250ms",
      },
      width: {
        sidebar: "240px",
        "sidebar-collapsed": "64px",
      },
    },
  },
  plugins: [],
};
