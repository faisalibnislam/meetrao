/* @ds-bundle: {"format":4,"namespace":"MeetraoDesignSystem_9aa8b5","components":[{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"CountBadge","sourcePath":"components/core/CountBadge.jsx"},{"name":"Eyebrow","sourcePath":"components/core/Eyebrow.jsx"},{"name":"MEETRAO_GLYPHS","sourcePath":"components/core/Icon.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Spinner","sourcePath":"components/core/Spinner.jsx"},{"name":"Card","sourcePath":"components/data/Card.jsx"},{"name":"DataTable","sourcePath":"components/data/DataTable.jsx"},{"name":"EmptyState","sourcePath":"components/data/EmptyState.jsx"},{"name":"KeyValueRow","sourcePath":"components/data/KeyValueRow.jsx"},{"name":"ListRow","sourcePath":"components/data/ListRow.jsx"},{"name":"MetricCard","sourcePath":"components/data/MetricCard.jsx"},{"name":"Dialog","sourcePath":"components/feedback/Dialog.jsx"},{"name":"Notice","sourcePath":"components/feedback/Notice.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"ChoiceChip","sourcePath":"components/forms/ChoiceChip.jsx"},{"name":"Field","sourcePath":"components/forms/Field.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"MenuSelect","sourcePath":"components/forms/MenuSelect.jsx"},{"name":"SearchField","sourcePath":"components/forms/SearchField.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Textarea","sourcePath":"components/forms/Textarea.jsx"},{"name":"Breadcrumb","sourcePath":"components/navigation/Breadcrumb.jsx"},{"name":"NavItem","sourcePath":"components/navigation/NavItem.jsx"},{"name":"StepTracker","sourcePath":"components/navigation/StepTracker.jsx"},{"name":"SubNav","sourcePath":"components/navigation/SubNav.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"},{"name":"BookingLinkChip","sourcePath":"components/scheduling/BookingLinkChip.jsx"},{"name":"CopyLinkButton","sourcePath":"components/scheduling/CopyLinkButton.jsx"},{"name":"DatePicker","sourcePath":"components/scheduling/DatePicker.jsx"},{"name":"DayHoursRow","sourcePath":"components/scheduling/DayHoursRow.jsx"},{"name":"SlotGrid","sourcePath":"components/scheduling/SlotGrid.jsx"}],"sourceHashes":{"components/core/Avatar.jsx":"4ebdb0324484","components/core/Badge.jsx":"f8d78a78e951","components/core/Button.jsx":"d3d820ae3946","components/core/CountBadge.jsx":"03901bf37388","components/core/Eyebrow.jsx":"06cdb4dd44a8","components/core/Icon.jsx":"41dcca8f5891","components/core/IconButton.jsx":"0ddf6f44d732","components/core/Spinner.jsx":"d3a9254f932b","components/data/Card.jsx":"94c5e426bd2c","components/data/DataTable.jsx":"893522f41e63","components/data/EmptyState.jsx":"679f59d2e888","components/data/KeyValueRow.jsx":"8689155f3635","components/data/ListRow.jsx":"f47eeb53411c","components/data/MetricCard.jsx":"4a18b7ba2f3e","components/feedback/Dialog.jsx":"6aed06df8df2","components/feedback/Notice.jsx":"1dd44225a285","components/feedback/Toast.jsx":"42d4420eaf4f","components/forms/Checkbox.jsx":"0d0d6a947b55","components/forms/ChoiceChip.jsx":"7c69fee3b038","components/forms/Field.jsx":"234d8b830d2c","components/forms/Input.jsx":"b65e361178bf","components/forms/MenuSelect.jsx":"46a409796716","components/forms/SearchField.jsx":"b7979f23cda4","components/forms/Switch.jsx":"bb1f2b237c8e","components/forms/Textarea.jsx":"2d4b6a858924","components/navigation/Breadcrumb.jsx":"fad900204be6","components/navigation/NavItem.jsx":"85d61b862039","components/navigation/StepTracker.jsx":"85c822a9641f","components/navigation/SubNav.jsx":"257bd2133b3e","components/navigation/Tabs.jsx":"147b4c9d2436","components/scheduling/BookingLinkChip.jsx":"f1033ba17c9d","components/scheduling/CopyLinkButton.jsx":"ad227a35a7d4","components/scheduling/DatePicker.jsx":"2587a264a5dd","components/scheduling/DayHoursRow.jsx":"50ce025847c5","components/scheduling/SlotGrid.jsx":"74d9b9a9f23c","ui_kits/app/AppShell.jsx":"1874553ff3b2","ui_kits/app/AvailabilityScreen.jsx":"8b71a19db173","ui_kits/app/BookingsScreen.jsx":"c7199ae83f26","ui_kits/app/DashboardScreen.jsx":"8c1c16d2afd9","ui_kits/app/MeetingsScreen.jsx":"fcf2784f700d","ui_kits/app/SettingsScreen.jsx":"241e4b53dde6","ui_kits/app/data.js":"b53bf79b833d","ui_kits/booking/BookingScreens.jsx":"a8ba5a6d0860"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.MeetraoDesignSystem_9aa8b5 = window.MeetraoDesignSystem_9aa8b5 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Avatar.jsx
try { (() => {
/* Meetrao — initials avatar. There are no photos in the product yet; every avatar
   is two letters on a tinted square. */
function Avatar({
  name = '',
  initials,
  size = 38,
  tone = 'accent',
  style
}) {
  const text = initials || name.split(' ').slice(0, 2).map(w => w[0]).join('');
  const radius = size <= 28 ? 'var(--radius-control)' : 'var(--radius-card)';
  const fs = size <= 28 ? 10.5 : size <= 32 ? 11 : size <= 38 ? 13 : 14;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 'none',
      width: size + 'px',
      height: size + 'px',
      borderRadius: size <= 26 ? 'var(--radius-xs)' : radius,
      background: tone === 'accent' ? 'var(--accent-soft)' : 'var(--fill-2)',
      color: tone === 'accent' ? 'var(--accent)' : 'var(--ink-2)',
      fontSize: fs + 'px',
      fontWeight: 700,
      ...style
    }
  }, text);
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
/* Meetrao — status badge. 20px tall, 4px radius, 5px dot. Status colours never decorate. */
const TONES = {
  ok: ['var(--accent-soft)', 'var(--accent-line)', 'var(--accent)'],
  bad: ['var(--red-soft)', 'var(--red-line)', 'var(--red)'],
  warn: ['var(--amber-soft)', 'var(--amber-line)', 'var(--amber)'],
  off: ['var(--fill)', 'var(--line)', 'var(--ink-2)']
};
function Badge({
  children,
  tone = 'ok',
  dot = true,
  style
}) {
  const c = TONES[tone] || TONES.off;
  const dotColor = {
    ok: 'var(--accent)',
    bad: 'var(--red)',
    warn: 'var(--amber)',
    off: 'var(--ink-3)'
  }[tone] || 'var(--ink-3)';
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      flex: 'none',
      height: '20px',
      padding: '0 8px',
      border: '1px solid ' + c[1],
      borderRadius: 'var(--radius-badge)',
      background: c[0],
      color: c[2],
      fontSize: '11.5px',
      fontWeight: 600,
      whiteSpace: 'nowrap',
      ...style
    }
  }, dot ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: '5px',
      height: '5px',
      borderRadius: '50%',
      background: dotColor,
      flex: 'none'
    }
  }) : null, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/CountBadge.jsx
try { (() => {
/* Meetrao — the numeric pill inside nav items and tabs. */
function CountBadge({
  children,
  active = false,
  style
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 'none',
      minWidth: '18px',
      height: '17px',
      padding: '0 5px',
      borderRadius: 'var(--radius-badge)',
      background: active ? 'var(--ink)' : 'var(--fill-2)',
      color: active ? '#fff' : 'var(--ink-2)',
      fontSize: '10.5px',
      fontWeight: 600,
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { CountBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/CountBadge.jsx", error: String((e && e.message) || e) }); }

// components/core/Eyebrow.jsx
try { (() => {
/* Meetrao — DM Mono uppercase micro-label. Section eyebrows, metric labels,
   table column headers, "or" dividers. */
function Eyebrow({
  children,
  size = 10.5,
  color = 'var(--ink-3)',
  tracking = '0.07em',
  style
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: size + 'px',
      letterSpacing: tracking,
      textTransform: 'uppercase',
      color,
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Eyebrow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Eyebrow.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Meetrao — Font Awesome 6 Sharp glyph. Light 300 for objects and navigation,
   Solid 900 for status, close and check. Referenced by codepoint. */
const MEETRAO_GLYPHS = {
  calendar: '\uf133',
  clock: '\uf017',
  video: '\uf03d',
  list: '\uf03a',
  gear: '\uf013',
  home: '\uf015',
  users: '\uf0c0',
  search: '\uf002',
  copy: '\uf0c5',
  link: '\uf0c1',
  check: '\uf00c',
  close: '\uf00d',
  error: '\uf06a',
  warning: '\uf071',
  'circle-check': '\uf058',
  'circle-info': '\uf05a',
  'circle-close': '\uf057',
  chevron: '\uf078',
  'chevron-right': '\uf054',
  'arrow-right': '\uf061',
  'arrow-left': '\uf060',
  plus: '+',
  sliders: '\uf1de',
  bolt: '\uf0e7',
  globe: '\uf0ac',
  camera: '\uf030',
  download: '\uf019',
  'user-plus': '\uf234',
  'sign-out': '\uf2f5',
  'sign-in': '\uf2f6',
  upload: '\uf0ee',
  trash: '\uf1f8',
  reset: '\uf021'
};
function Icon({
  name,
  glyph,
  solid = false,
  size = 13,
  color,
  width,
  style,
  ...rest
}) {
  const ch = glyph || MEETRAO_GLYPHS[name] || name || '';
  return /*#__PURE__*/React.createElement("span", _extends({
    "aria-hidden": "true",
    style: {
      fontFamily: 'var(--font-icon)',
      fontWeight: solid ? 900 : 300,
      fontSize: size + 'px',
      lineHeight: 1,
      color: color || 'inherit',
      flex: 'none',
      display: 'inline-block',
      ...(width ? {
        width: width + 'px',
        textAlign: 'center'
      } : null),
      ...style
    }
  }, rest), ch);
}
Object.assign(__ds_scope, { MEETRAO_GLYPHS, Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Meetrao — square ghost icon button: close, remove, log out, month nav. */
function IconButton({
  name,
  glyph,
  solid = false,
  size = 26,
  tone = 'default',
  title,
  disabled = false,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const hoverFg = tone === 'danger' ? 'var(--red)' : 'var(--ink)';
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    title: title,
    "aria-label": title,
    disabled: disabled,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 'none',
      width: size + 'px',
      height: size + 'px',
      border: '1px solid ' + (tone === 'outline' ? 'var(--line-strong)' : 'transparent'),
      borderRadius: size <= 22 ? 'var(--radius-badge)' : 'var(--radius-xs)',
      background: hover && !disabled ? tone === 'outline' ? 'var(--fill)' : 'var(--fill-2)' : tone === 'outline' ? 'var(--surface)' : 'transparent',
      color: hover && !disabled ? hoverFg : 'var(--ink-3)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      transition: 'background var(--dur-fast) var(--ease),color var(--dur-fast) var(--ease)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: name,
    glyph: glyph,
    solid: solid,
    size: size <= 22 ? 11 : 12,
    color: "currentColor"
  }));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Spinner.jsx
try { (() => {
/* Meetrao — inline button spinner. 700ms linear, one full turn. */
function Spinner({
  size = 12,
  color = '#fff',
  track = 'rgba(255,255,255,0.35)'
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      width: size + 'px',
      height: size + 'px',
      borderRadius: '50%',
      flex: 'none',
      border: '2px solid ' + track,
      borderTopColor: color,
      animation: 'mu-spin var(--dur-spin) linear infinite'
    }
  });
}
Object.assign(__ds_scope, { Spinner });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Spinner.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Meetrao — the one button. Primary is accent-filled, secondary is white with a
   strong border, ghost is transparent, danger is red. Heights come from the
   control scale: 26 row action · 28 compact · 30 small · 32 secondary · 36/38 form
   · 40 auth · 42/44 CTA · 46 hero. */
const SIZES = {
  xs: {
    h: 26,
    pad: 9,
    fs: 12,
    r: 'var(--radius-xs)',
    gap: 6
  },
  sm: {
    h: 28,
    pad: 10,
    fs: 12.5,
    r: 'var(--radius-control)',
    gap: 7
  },
  md: {
    h: 30,
    pad: 11,
    fs: 12.5,
    r: 'var(--radius-control)',
    gap: 7
  },
  lg: {
    h: 32,
    pad: 12,
    fs: 12.5,
    r: 'var(--radius-control)',
    gap: 7
  },
  xl: {
    h: 36,
    pad: 15,
    fs: 13.5,
    r: 'var(--radius-control)',
    gap: 8
  },
  form: {
    h: 38,
    pad: 15,
    fs: 13.5,
    r: 'var(--radius-control)',
    gap: 9
  },
  cta: {
    h: 42,
    pad: 18,
    fs: 14,
    r: 'var(--radius-control)',
    gap: 9
  },
  hero: {
    h: 46,
    pad: 22,
    fs: 14.5,
    r: 'var(--radius-cta)',
    gap: 9
  }
};
const TONES = {
  primary: {
    bg: 'var(--accent)',
    border: 'var(--accent)',
    fg: '#fff',
    hover: 'var(--accent-2)'
  },
  secondary: {
    bg: 'var(--surface)',
    border: 'var(--line-strong)',
    fg: 'var(--ink)',
    hover: 'var(--fill)'
  },
  ghost: {
    bg: 'transparent',
    border: 'transparent',
    fg: 'var(--ink-2)',
    hover: 'var(--fill-2)'
  },
  danger: {
    bg: 'var(--red)',
    border: 'var(--red)',
    fg: '#fff',
    hover: 'var(--red-2)'
  },
  ink: {
    bg: 'var(--ink)',
    border: 'var(--ink)',
    fg: '#fff',
    hover: '#000'
  },
  onAccent: {
    bg: '#fff',
    border: '#fff',
    fg: 'var(--accent)',
    hover: '#fff'
  }
};
function Button({
  children,
  variant = 'primary',
  size = 'lg',
  icon,
  iconRight,
  iconSolid = false,
  loading = false,
  disabled = false,
  fullWidth = false,
  as = 'button',
  href,
  style,
  ...rest
}) {
  const s = SIZES[size] || SIZES.lg;
  const t = TONES[variant] || TONES.primary;
  const [hover, setHover] = React.useState(false);
  const Tag = as === 'a' ? 'a' : 'button';
  const glyph = name => /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: name,
    solid: iconSolid,
    size: s.fs < 13 ? 10 : 11,
    color: "currentColor"
  });
  return /*#__PURE__*/React.createElement(Tag, _extends({}, Tag === 'button' ? {
    type: 'button',
    disabled: disabled || loading
  } : {
    href
  }, {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: s.gap + 'px',
      boxSizing: 'border-box',
      height: s.h + 'px',
      padding: '0 ' + s.pad + 'px',
      width: fullWidth ? '100%' : undefined,
      border: '1px solid ' + t.border,
      borderRadius: s.r,
      background: hover && !disabled ? t.hover : t.bg,
      color: t.fg,
      fontFamily: 'var(--font-sans)',
      fontSize: s.fs + 'px',
      fontWeight: 600,
      textDecoration: 'none',
      whiteSpace: 'nowrap',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.55 : 1,
      transition: 'background var(--dur-fast) var(--ease),border-color var(--dur-fast) var(--ease)',
      ...style
    }
  }, rest), loading ? /*#__PURE__*/React.createElement(__ds_scope.Spinner, {
    size: 12,
    color: t.fg,
    track: t.fg === '#fff' ? 'rgba(255,255,255,0.35)' : 'var(--line-strong)'
  }) : null, icon && !loading ? glyph(icon) : null, /*#__PURE__*/React.createElement("span", null, children), iconRight ? glyph(iconRight) : null);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/data/Card.jsx
try { (() => {
/* Meetrao — the plain surface. White, 1px --line, 8px radius. Shadows are not used
   on in-page cards; the border does the work. Set padding to 0 for tables and row lists. */
function Card({
  children,
  padding = 0,
  radius = 'var(--radius-card)',
  dashed = false,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px ' + (dashed ? 'dashed var(--line-strong)' : 'solid var(--line)'),
      borderRadius: radius,
      background: 'var(--surface)',
      overflow: 'hidden',
      padding: typeof padding === 'number' ? padding + 'px' : padding,
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Card.jsx", error: String((e && e.message) || e) }); }

// components/data/DataTable.jsx
try { (() => {
/* Meetrao — the product table. Bordered card, --fill header row with DM Mono uppercase
   labels, --line-soft row dividers, --fill row hover. Tables scroll horizontally
   inside the card rather than reflowing. */
function DataTable({
  columns = [],
  rows = [],
  minWidth = 700,
  renderCell,
  style
}) {
  const [hover, setHover] = React.useState(-1);
  const th = col => ({
    padding: '9px 14px',
    borderBottom: '1px solid var(--line)',
    background: 'var(--fill)',
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    letterSpacing: '0.07em',
    textTransform: 'uppercase',
    fontWeight: 400,
    color: 'var(--ink-2)',
    whiteSpace: 'nowrap',
    textAlign: col.align || 'left',
    width: col.width,
    minWidth: col.minWidth
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius-card)',
      background: 'var(--surface)',
      overflow: 'hidden',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      overflowX: 'auto'
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      minWidth: minWidth + 'px',
      borderCollapse: 'collapse'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, columns.map((c, i) => /*#__PURE__*/React.createElement("th", {
    key: c.key || i,
    style: th(c)
  }, c.label)))), /*#__PURE__*/React.createElement("tbody", null, rows.map((r, ri) => /*#__PURE__*/React.createElement("tr", {
    key: r.key || ri,
    onMouseEnter: () => setHover(ri),
    onMouseLeave: () => setHover(-1),
    style: {
      borderBottom: '1px solid var(--line-soft)',
      background: hover === ri ? 'var(--fill)' : 'transparent'
    }
  }, columns.map((c, ci) => /*#__PURE__*/React.createElement("td", {
    key: c.key || ci,
    style: {
      padding: '10px 14px',
      verticalAlign: 'middle',
      fontSize: '13px',
      color: 'var(--ink)',
      textAlign: c.align || 'left',
      whiteSpace: c.nowrap ? 'nowrap' : undefined
    }
  }, renderCell ? renderCell(r, c, ri) : r[c.key]))))))));
}
Object.assign(__ds_scope, { DataTable });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/DataTable.jsx", error: String((e && e.message) || e) }); }

// components/data/EmptyState.jsx
try { (() => {
/* Meetrao — dashed empty state. Title, one explanatory line, and at most one action.
   Search misses and genuinely-empty lists get different copy. */
function EmptyState({
  title,
  text,
  action,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: '7px',
      padding: '28px 20px',
      border: '1px dashed var(--line-strong)',
      borderRadius: 'var(--radius-card)',
      background: 'var(--surface)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '14px',
      fontWeight: 600,
      color: 'var(--ink)'
    }
  }, title), text ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13px',
      color: 'var(--ink-2)'
    }
  }, text) : null, action ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: '3px'
    }
  }, action) : null);
}
Object.assign(__ds_scope, { EmptyState });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/EmptyState.jsx", error: String((e && e.message) || e) }); }

// components/data/KeyValueRow.jsx
try { (() => {
/* Meetrao — key/value line in a detail view. Fixed muted key column, then the value.
   Emails, Meet URLs and reference IDs are mono. */
function KeyValueRow({
  label,
  value,
  mono = false,
  keyWidth = 92,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '12px',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: keyWidth + 'px',
      flex: 'none',
      fontSize: '12.5px',
      color: 'var(--ink-3)'
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: '150px',
      fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
      fontSize: mono ? '12.5px' : '13px',
      color: 'var(--ink)',
      wordBreak: mono ? 'break-all' : undefined
    }
  }, value));
}
Object.assign(__ds_scope, { KeyValueRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/KeyValueRow.jsx", error: String((e && e.message) || e) }); }

// components/data/ListRow.jsx
try { (() => {
/* Meetrao — a divided row inside a bordered card. Used for today's meetings, activity
   feeds, availability days and detail lists. First row has no top border. */
function ListRow({
  children,
  first = false,
  hoverable = false,
  inert = false,
  align = 'center',
  style
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: align === 'top' ? 'flex-start' : 'center',
      gap: '14px',
      padding: '12px 15px',
      borderTop: first ? undefined : '1px solid var(--line-soft)',
      background: inert ? 'var(--fill)' : hoverable && hover ? 'var(--fill)' : 'transparent',
      transition: 'background var(--dur-fast) var(--ease)',
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { ListRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/ListRow.jsx", error: String((e && e.message) || e) }); }

// components/data/MetricCard.jsx
try { (() => {
/* Meetrao — dashboard metric. Each card is tinted by tone, with a white icon tile,
   an optional mono trend note, the value, the label and one explanatory line. */
const TONES = {
  accent: ['var(--accent-soft)', 'var(--accent-line)', 'var(--accent)'],
  slate: ['var(--slate-soft)', 'var(--slate-line)', 'var(--slate)'],
  amber: ['var(--amber-soft)', 'var(--amber-line)', 'var(--amber)'],
  plain: ['var(--fill)', 'var(--line)', 'var(--ink-2)']
};
function MetricCard({
  icon,
  value,
  unit,
  label,
  note,
  trend,
  tone = 'plain',
  style
}) {
  const c = TONES[tone] || TONES.plain;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      minHeight: '118px',
      padding: '14px 15px',
      border: '1px solid ' + c[1],
      borderRadius: 'var(--radius-metric)',
      background: c[0],
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 'none',
      width: '30px',
      height: '30px',
      borderRadius: 'var(--radius-card)',
      background: 'var(--surface)',
      color: c[2]
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 13,
    color: "currentColor"
  })), trend ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '10px',
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color: c[2],
      paddingTop: '4px'
    }
  }, trend) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '3px',
      marginTop: 'auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: '5px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '26px',
      fontWeight: 600,
      letterSpacing: '-0.022em',
      lineHeight: 1,
      color: c[2]
    }
  }, value), unit ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12.5px',
      fontWeight: 500,
      color: 'var(--ink-3)'
    }
  }, unit) : null), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12.5px',
      fontWeight: 600,
      color: 'var(--ink)'
    }
  }, label), note ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '11.5px',
      lineHeight: 1.4,
      color: 'var(--ink-3)'
    }
  }, note) : null));
}
Object.assign(__ds_scope, { MetricCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/MetricCard.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Dialog.jsx
try { (() => {
/* Meetrao — modal dialog. Scrim, white card (10px radius, --pop, mu-in), a bordered
   header with the close button, the body, and a --fill footer with the ghost secondary
   to the LEFT of the emphasised primary. Escape and click-outside dismiss. */
function Dialog({
  open = true,
  title,
  subtitle,
  children,
  primary,
  secondary,
  onClose,
  width = 400,
  style
}) {
  React.useEffect(() => {
    if (!open || !onClose) return;
    const key = e => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [open, onClose]);
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 120,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: 'var(--scrim)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    role: "dialog",
    "aria-modal": "true",
    onClick: e => e.stopPropagation(),
    style: {
      width: '100%',
      maxWidth: width + 'px',
      background: 'var(--surface)',
      border: '1px solid var(--line)',
      borderRadius: '10px',
      boxShadow: 'var(--pop)',
      overflow: 'hidden',
      animation: 'mu-in var(--dur-pop) var(--ease) both',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: '14px',
      padding: '18px 20px 14px',
      borderBottom: '1px solid var(--line)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '3px',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '15px',
      fontWeight: 600,
      color: 'var(--ink)'
    }
  }, title), subtitle ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12.5px',
      color: 'var(--ink-2)'
    }
  }, subtitle) : null), onClose ? /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    name: "close",
    title: "Close",
    onClick: onClose
  }) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '18px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px'
    }
  }, children), primary || secondary ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: '8px',
      padding: '14px 20px',
      borderTop: '1px solid var(--line)',
      background: 'var(--fill)'
    }
  }, secondary, primary) : null));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Notice.jsx
try { (() => {
/* Meetrao — inline banner/panel. Amber warns, red reports a failure, accent confirms.
   Solid status glyph, a bold first line, one explanatory sentence, at most one action. */
const TONES = {
  warn: {
    bg: 'var(--amber-soft)',
    line: 'var(--amber-line)',
    fg: 'var(--amber)',
    body: 'var(--amber-ink)',
    glyph: 'warning'
  },
  bad: {
    bg: 'var(--red-soft)',
    line: 'var(--red-line)',
    fg: 'var(--red)',
    body: 'var(--red-ink)',
    glyph: 'error'
  },
  ok: {
    bg: 'var(--accent-soft)',
    line: 'var(--accent-line)',
    fg: 'var(--accent)',
    body: 'var(--ink-2)',
    glyph: 'circle-check'
  },
  neutral: {
    bg: 'var(--fill)',
    line: 'var(--line)',
    fg: 'var(--ink-2)',
    body: 'var(--ink-2)',
    glyph: 'circle-info'
  }
};
function Notice({
  tone = 'warn',
  title,
  children,
  action,
  style
}) {
  const t = TONES[tone] || TONES.warn;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: action ? 'center' : 'flex-start',
      gap: '12px',
      padding: '12px 14px',
      border: '1px solid ' + t.line,
      borderRadius: 'var(--radius-card)',
      background: t.bg,
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: t.glyph,
    solid: true,
    size: 13,
    color: t.fg,
    style: {
      marginTop: action ? 0 : '2px'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: '190px',
      display: 'flex',
      flexDirection: 'column',
      gap: '3px'
    }
  }, title ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13px',
      fontWeight: 600,
      color: t.fg
    }
  }, title) : null, children ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12.5px',
      lineHeight: 1.5,
      color: t.body
    }
  }, children) : null), action ? /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 'none'
    }
  }, action) : null);
}
Object.assign(__ds_scope, { Notice });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Notice.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
/* Meetrao — bottom-right toast. White card, --pop shadow, mu-in entrance,
   auto-dismiss at 3200ms plus a manual dismiss. Four tones. */
const TONES = {
  ok: {
    glyph: 'circle-check',
    color: 'var(--accent)'
  },
  bad: {
    glyph: 'error',
    color: 'var(--red)'
  },
  warn: {
    glyph: 'warning',
    color: 'var(--amber)'
  },
  neutral: {
    glyph: 'circle-info',
    color: 'var(--ink-3)'
  }
};
function Toast({
  tone = 'ok',
  title,
  text,
  onDismiss,
  fixed = true,
  style
}) {
  const t = TONES[tone] || TONES.neutral;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      ...(fixed ? {
        position: 'fixed',
        bottom: '58px',
        right: '18px',
        zIndex: 130
      } : null),
      maxWidth: '320px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '11px',
      padding: '12px 14px',
      background: 'var(--surface)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius-card)',
      boxShadow: 'var(--pop)',
      animation: 'mu-in var(--dur-pop) var(--ease) both',
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: t.glyph,
    solid: true,
    size: 13,
    color: t.color,
    style: {
      marginTop: '1px'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13px',
      fontWeight: 600,
      color: 'var(--ink)'
    }
  }, title), text ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12.5px',
      lineHeight: 1.45,
      color: 'var(--ink-2)',
      wordBreak: 'break-word'
    }
  }, text) : null), onDismiss ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onDismiss,
    title: "Dismiss",
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 'none',
      width: '22px',
      height: '22px',
      border: 0,
      borderRadius: 'var(--radius-badge)',
      background: 'transparent',
      color: 'var(--ink-3)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "close",
    size: 11,
    color: "currentColor"
  })) : null);
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
/* Meetrao — 16px checkbox with a solid white check. Used for the day toggles. */
function Checkbox({
  checked = false,
  onChange,
  label,
  width,
  style
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    role: "checkbox",
    "aria-checked": checked,
    onClick: onChange,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '9px',
      flex: 'none',
      width: width ? width + 'px' : undefined,
      padding: '6px 0',
      border: 0,
      background: 'transparent',
      cursor: 'pointer',
      textAlign: 'left',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 'none',
      width: '16px',
      height: '16px',
      borderRadius: 'var(--radius-badge)',
      border: '1px solid ' + (checked ? 'var(--accent)' : 'var(--line-strong)'),
      background: checked ? 'var(--accent)' : 'var(--surface)',
      transition: 'background var(--dur-fast) var(--ease),border-color var(--dur-fast) var(--ease)'
    }
  }, checked ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-icon)',
      fontWeight: 900,
      fontSize: '9px',
      color: '#fff'
    }
  }, "\uF00C") : null), label ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: '13.5px',
      fontWeight: 500,
      color: 'var(--ink)'
    }
  }, label) : null);
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/ChoiceChip.jsx
try { (() => {
/* Meetrao — a chip in a single-select row. Selected is accent-filled, white text. */
function ChoiceChip({
  children,
  selected = false,
  onClick,
  style
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClick,
    "aria-pressed": selected,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      height: '32px',
      padding: '0 13px',
      border: '1px solid ' + (selected ? 'var(--accent)' : 'var(--line-strong)'),
      borderRadius: 'var(--radius-control)',
      background: selected ? 'var(--accent)' : 'var(--surface)',
      color: selected ? '#fff' : 'var(--ink)',
      fontFamily: 'var(--font-sans)',
      fontSize: '13px',
      fontWeight: selected ? 600 : 500,
      cursor: 'pointer',
      transition: 'background var(--dur-fast) var(--ease),border-color var(--dur-fast) var(--ease)',
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { ChoiceChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/ChoiceChip.jsx", error: String((e && e.message) || e) }); }

// components/forms/Field.jsx
try { (() => {
/* Meetrao — label + control + helper/error. Labels are 12.5/600 ink; helpers 12 ink-3;
   errors 12 red with a solid warning glyph. Errors appear only after a submit attempt. */
function Field({
  label,
  htmlFor,
  helper,
  error,
  action,
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: htmlFor,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      ...style
    }
  }, label ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: action ? 'space-between' : 'flex-start',
      gap: '12px',
      fontSize: '12.5px',
      fontWeight: 600,
      color: 'var(--ink)'
    }
  }, label, action) : null, children, error ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '12px',
      color: 'var(--red)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-icon)',
      fontWeight: 900,
      fontSize: '10px'
    }
  }, "\uF071"), error) : null, helper && !error ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12px',
      color: 'var(--ink-3)'
    }
  }, helper) : null);
}
Object.assign(__ds_scope, { Field });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Field.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Meetrao — text input. 34px standard, 36px in product forms, 38px on auth.
   Focus paints an accent border plus the 3px ring. */
function Input({
  size = 'md',
  invalid = false,
  style,
  ...rest
}) {
  const h = size === 'lg' ? 38 : size === 'form' ? 36 : 34;
  const [focus, setFocus] = React.useState(false);
  return /*#__PURE__*/React.createElement("input", _extends({
    onFocus: e => {
      setFocus(true);
      if (rest.onFocus) rest.onFocus(e);
    },
    onBlur: e => {
      setFocus(false);
      if (rest.onBlur) rest.onBlur(e);
    },
    style: {
      width: '100%',
      boxSizing: 'border-box',
      height: h + 'px',
      padding: '0 12px',
      border: '1px solid ' + (invalid ? 'var(--red)' : focus ? 'var(--accent)' : 'var(--line-strong)'),
      borderRadius: 'var(--radius-control)',
      background: 'var(--surface)',
      fontFamily: 'var(--font-sans)',
      fontSize: '13.5px',
      color: 'var(--ink)',
      outline: 'none',
      boxShadow: focus ? 'var(--ring)' : 'none',
      transition: 'border-color var(--dur-fast) var(--ease),box-shadow var(--dur-fast) var(--ease)',
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/MenuSelect.jsx
try { (() => {
/* Meetrao — the custom select used for every dropdown in the product.
   Opens downward, flips up when there is no room, becomes searchable above 12 options,
   scrolls the current value into view, closes on click-outside or Escape, opens on ArrowDown. */
function MenuSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Select',
  size = 'md',
  placement = 'auto',
  searchable,
  bottomInset = 52,
  style
}) {
  const [open, setOpen] = React.useState(false);
  const [up, setUp] = React.useState(false);
  const [maxH, setMaxH] = React.useState(280);
  const [query, setQuery] = React.useState('');
  const rootRef = React.useRef(null);
  const listRef = React.useRef(null);
  const opts = options.map(o => typeof o === 'string' ? {
    value: o,
    label: o
  } : o);
  const cur = opts.filter(o => o.value === value)[0];
  const q = query.trim().toLowerCase();
  const shown = q ? opts.filter(o => String(o.label).toLowerCase().indexOf(q) >= 0) : opts;
  const isSearchable = searchable === true || opts.length > 12;
  const sm = size === 'sm';
  const h = sm ? 28 : 34;
  const fs = sm ? 12.5 : 13.5;
  const close = React.useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);
  React.useEffect(() => {
    const out = e => {
      if (rootRef.current && !rootRef.current.contains(e.target)) close();
    };
    const key = e => {
      if (e.key === 'Escape') close();
    };
    if (open) {
      document.addEventListener('mousedown', out, true);
      document.addEventListener('keydown', key);
    }
    return () => {
      document.removeEventListener('mousedown', out, true);
      document.removeEventListener('keydown', key);
    };
  }, [open, close]);
  const place = () => {
    const el = rootRef.current;
    if (!el) return {
      nextUp: false,
      nextMax: 280
    };
    const rect = el.getBoundingClientRect();
    let top = 0;
    let bottom = window.innerHeight;
    let node = el.parentElement;
    while (node && node !== document.body) {
      const oy = getComputedStyle(node).overflowY;
      if (oy === 'auto' || oy === 'scroll' || oy === 'hidden') {
        const b = node.getBoundingClientRect();
        top = Math.max(top, b.top);
        bottom = Math.min(bottom, b.bottom);
        break;
      }
      node = node.parentElement;
    }
    bottom = Math.min(bottom, window.innerHeight - Number(bottomInset));
    const below = bottom - rect.bottom - 10;
    const above = rect.top - top - 10;
    let nextUp = below < Math.min(280, 190) && above > below;
    if (placement === 'up') nextUp = true;
    if (placement === 'down') nextUp = false;
    return {
      nextUp,
      nextMax: Math.max(140, Math.min(280, (nextUp ? above : below) - 10))
    };
  };
  const doOpen = () => {
    const {
      nextUp,
      nextMax
    } = place();
    setUp(nextUp);
    setMaxH(nextMax);
    setQuery('');
    setOpen(true);
    setTimeout(() => {
      const box = listRef.current;
      if (!box) return;
      const el = box.querySelector('[aria-selected="true"]');
      if (el && box.scrollHeight > box.clientHeight + 4) {
        box.scrollTop = Math.max(0, el.offsetTop - box.clientHeight / 2 + el.offsetHeight / 2);
      }
    }, 40);
  };
  const listMax = Math.max(96, maxH - (isSearchable ? 46 : 10));
  return /*#__PURE__*/React.createElement("div", {
    ref: rootRef,
    style: {
      position: 'relative',
      width: '100%',
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-haspopup": "listbox",
    "aria-expanded": open,
    onClick: () => open ? close() : doOpen(),
    onKeyDown: e => {
      if (e.key === 'ArrowDown' && !open) {
        e.preventDefault();
        doOpen();
      }
    },
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      width: '100%',
      boxSizing: 'border-box',
      height: h + 'px',
      padding: '0 ' + (sm ? 9 : 11) + 'px',
      border: '1px solid ' + (open ? 'var(--accent)' : 'var(--line-strong)'),
      borderRadius: 'var(--radius-control)',
      background: 'var(--surface)',
      color: cur ? 'var(--ink)' : 'var(--ink-3)',
      fontFamily: 'var(--font-sans)',
      fontSize: fs + 'px',
      fontWeight: 500,
      cursor: 'pointer',
      boxShadow: open ? 'var(--ring)' : 'none',
      transition: 'border-color var(--dur-fast) var(--ease),box-shadow var(--dur-fast) var(--ease)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      textAlign: 'left',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, cur ? cur.label : placeholder), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-icon)',
      fontWeight: 300,
      fontSize: '10px',
      color: 'var(--ink-3)',
      flex: 'none',
      transition: 'transform var(--dur-base) var(--ease)',
      transform: 'rotate(' + (open ? '180deg' : '0deg') + ')'
    }
  }, "\uF078")), open ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      minWidth: '100%',
      width: 'max-content',
      maxWidth: '320px',
      zIndex: 80,
      background: 'var(--surface)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius-card)',
      boxShadow: 'var(--pop)',
      overflow: 'hidden',
      ...(up ? {
        bottom: 'calc(100% + 5px)'
      } : {
        top: 'calc(100% + 5px)'
      }),
      animation: 'mu-pop var(--dur-fast) var(--ease) both'
    }
  }, isSearchable ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '7px 8px',
      borderBottom: '1px solid var(--line)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-icon)',
      fontWeight: 300,
      fontSize: '12px',
      color: 'var(--ink-3)',
      flex: 'none'
    }
  }, "\uF002"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: query,
    autoFocus: true,
    placeholder: "Filter...",
    onChange: e => setQuery(e.target.value),
    style: {
      flex: 1,
      minWidth: 0,
      border: 0,
      outline: 'none',
      background: 'transparent',
      fontFamily: 'var(--font-sans)',
      fontSize: '13px',
      color: 'var(--ink)',
      padding: '2px 0'
    }
  })) : null, /*#__PURE__*/React.createElement("div", {
    ref: listRef,
    role: "listbox",
    style: {
      maxHeight: listMax + 'px',
      overflowY: 'auto',
      padding: '8px',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px'
    }
  }, shown.map(o => {
    const on = o.value === value;
    return /*#__PURE__*/React.createElement("button", {
      key: o.value,
      type: "button",
      role: "option",
      "aria-selected": on,
      onClick: () => {
        close();
        if (onChange) onChange(o.value);
      },
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        width: '100%',
        boxSizing: 'border-box',
        height: '38px',
        padding: '0 12px',
        border: 0,
        borderRadius: 'var(--radius-control)',
        background: on ? 'var(--accent-soft)' : 'transparent',
        color: 'var(--ink)',
        fontFamily: 'var(--font-sans)',
        fontSize: '13px',
        fontWeight: on ? 600 : 400,
        cursor: 'pointer',
        textAlign: 'left'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        minWidth: 0,
        textAlign: 'left',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, o.label), on ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-icon)',
        fontWeight: 900,
        fontSize: '11px',
        color: 'var(--accent)',
        flex: 'none'
      }
    }, "\uF00C") : null);
  }), shown.length === 0 ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      padding: '10px 12px',
      fontSize: '13px',
      color: 'var(--ink-3)'
    }
  }, "No matches.") : null)) : null);
}
Object.assign(__ds_scope, { MenuSelect });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/MenuSelect.jsx", error: String((e && e.message) || e) }); }

// components/forms/SearchField.jsx
try { (() => {
/* Meetrao — the search box that sits above every table. Glyph, then a borderless input. */
function SearchField({
  value,
  onChange,
  placeholder = 'Search…',
  width = 230,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      width: width + 'px',
      maxWidth: '100%',
      height: '32px',
      padding: '0 10px',
      border: '1px solid var(--line-strong)',
      borderRadius: 'var(--radius-control)',
      background: 'var(--surface)',
      boxSizing: 'border-box',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-icon)',
      fontWeight: 300,
      fontSize: '12px',
      color: 'var(--ink-3)',
      flex: 'none'
    }
  }, "\uF002"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    style: {
      flex: 1,
      minWidth: 0,
      border: 0,
      outline: 'none',
      background: 'transparent',
      fontFamily: 'var(--font-sans)',
      fontSize: '13px',
      color: 'var(--ink)'
    }
  }));
}
Object.assign(__ds_scope, { SearchField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/SearchField.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
/* Meetrao — 34×20 switch. Accent track on, fill-2 off, 14px thumb with a 140ms spring. */
function Switch({
  checked = false,
  onChange,
  disabled = false,
  style
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    role: "switch",
    "aria-checked": checked,
    disabled: disabled,
    onClick: onChange,
    style: {
      position: 'relative',
      width: '34px',
      height: '20px',
      padding: 0,
      flex: 'none',
      border: '1px solid ' + (checked ? 'var(--accent)' : 'var(--line-strong)'),
      borderRadius: '10px',
      background: checked ? 'var(--accent)' : 'var(--fill-2)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: 'background var(--dur-base) var(--ease),border-color var(--dur-base) var(--ease)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: '2px',
      left: checked ? '16px' : '2px',
      width: '14px',
      height: '14px',
      borderRadius: '50%',
      background: '#fff',
      boxShadow: 'var(--shadow-thumb)',
      transition: 'left var(--dur-base) var(--ease-spring)'
    }
  }));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/forms/Textarea.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Meetrao — multi-line input. Vertically resizable, 3 rows by default. */
function Textarea({
  rows = 3,
  invalid = false,
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  return /*#__PURE__*/React.createElement("textarea", _extends({
    rows: rows,
    onFocus: e => {
      setFocus(true);
      if (rest.onFocus) rest.onFocus(e);
    },
    onBlur: e => {
      setFocus(false);
      if (rest.onBlur) rest.onBlur(e);
    },
    style: {
      width: '100%',
      boxSizing: 'border-box',
      padding: '9px 12px',
      border: '1px solid ' + (invalid ? 'var(--red)' : focus ? 'var(--accent)' : 'var(--line-strong)'),
      borderRadius: 'var(--radius-control)',
      background: 'var(--surface)',
      fontFamily: 'var(--font-sans)',
      fontSize: '13.5px',
      lineHeight: 1.5,
      color: 'var(--ink)',
      outline: 'none',
      resize: 'vertical',
      boxShadow: focus ? 'var(--ring)' : 'none',
      transition: 'border-color var(--dur-fast) var(--ease),box-shadow var(--dur-fast) var(--ease)',
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Textarea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Textarea.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Breadcrumb.jsx
try { (() => {
/* Meetrao — one-level breadcrumb above a page title. Parent link, chevron, current page. */
function Breadcrumb({
  parent,
  current,
  onBack,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '7px',
      fontSize: '12px',
      color: 'var(--ink-3)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => {
      e.preventDefault();
      if (onBack) onBack();
    },
    style: {
      fontSize: '12px',
      fontWeight: 500,
      color: 'var(--ink-2)'
    }
  }, parent), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-right",
    size: 8
  }), /*#__PURE__*/React.createElement("span", null, current));
}
Object.assign(__ds_scope, { Breadcrumb });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Breadcrumb.jsx", error: String((e && e.message) || e) }); }

// components/navigation/NavItem.jsx
try { (() => {
/* Meetrao — sidebar nav item. 32px, 6px radius, 15px glyph column. Active is a white
   pill with a --line border, ink label at 600 and an accent glyph; inactive hover
   paints translucent white over the #EFEDE7 sidebar. */
function NavItem({
  icon,
  label,
  count,
  active = false,
  onClick,
  style
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClick,
    "aria-current": active ? 'page' : undefined,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      width: '100%',
      boxSizing: 'border-box',
      height: '32px',
      padding: '0 9px',
      border: '1px solid ' + (active ? 'var(--line)' : 'transparent'),
      borderRadius: 'var(--radius-control)',
      background: active ? 'var(--surface)' : hover ? 'rgba(255,255,255,0.55)' : 'transparent',
      color: active ? 'var(--ink)' : hover ? 'var(--ink)' : 'var(--ink-2)',
      fontFamily: 'var(--font-sans)',
      fontSize: '13px',
      fontWeight: active ? 600 : 500,
      cursor: 'pointer',
      boxShadow: active ? 'var(--shadow-nav)' : 'none',
      transition: 'background var(--dur-fast) var(--ease),color var(--dur-fast) var(--ease)',
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 13,
    width: 15,
    color: active ? 'var(--accent)' : 'var(--ink-3)'
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      textAlign: 'left',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, label), count != null ? /*#__PURE__*/React.createElement(__ds_scope.CountBadge, {
    active: active
  }, count) : null);
}
Object.assign(__ds_scope, { NavItem });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/NavItem.jsx", error: String((e && e.message) || e) }); }

// components/navigation/StepTracker.jsx
try { (() => {
/* Meetrao — onboarding step tracker. "Step N / 5" in mono, then five nodes joined by
   2px connectors. Done nodes are accent with a solid check; the current node is 22px
   with an accent-soft halo and its name spelled out; upcoming nodes are white. */
function StepTracker({
  steps = [],
  current = 1,
  mobile = false,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      minWidth: 0,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '10.5px',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--ink-3)',
      whiteSpace: 'nowrap'
    }
  }, 'Step ' + current + ' / ' + steps.length), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      minWidth: 0
    }
  }, steps.map((label, i) => {
    const n = i + 1;
    const done = n < current;
    const on = n === current;
    return /*#__PURE__*/React.createElement("div", {
      key: label,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: on ? '8px' : 0,
        flex: 'none'
      }
    }, n > 1 ? /*#__PURE__*/React.createElement("span", {
      style: {
        width: (mobile ? 10 : 18) + 'px',
        height: '2px',
        flex: 'none',
        background: done || on ? 'var(--accent)' : 'var(--line-strong)'
      }
    }) : null, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 'none',
        boxSizing: 'border-box',
        width: (on ? 22 : 18) + 'px',
        height: (on ? 22 : 18) + 'px',
        borderRadius: '50%',
        fontWeight: 600,
        transition: 'all var(--dur-pop) var(--ease)',
        ...(done ? {
          border: '1px solid var(--accent)',
          background: 'var(--accent)',
          color: '#fff',
          fontFamily: 'var(--font-icon)',
          fontSize: '8px'
        } : on ? {
          border: '1px solid var(--accent)',
          background: 'var(--accent)',
          color: '#fff',
          boxShadow: 'var(--ring-accent)',
          fontSize: '11px'
        } : {
          border: '1px solid var(--line-strong)',
          background: 'var(--surface)',
          color: 'var(--ink-3)',
          fontSize: '10px'
        })
      }
    }, done ? '\uf00c' : n), on && !mobile ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '12.5px',
        fontWeight: 600,
        color: 'var(--ink)',
        whiteSpace: 'nowrap'
      }
    }, label) : null);
  })));
}
Object.assign(__ds_scope, { StepTracker });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/StepTracker.jsx", error: String((e && e.message) || e) }); }

// components/navigation/SubNav.jsx
try { (() => {
/* Meetrao — Settings sub-nav. Desktop: 30px rows with a 2px left border that turns ink
   when active. Mobile: a horizontally scrolling chip row. */
function SubNav({
  items = [],
  value,
  onChange,
  mobile = false,
  style
}) {
  return /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      flexDirection: mobile ? 'row' : 'column',
      gap: mobile ? '6px' : '2px',
      overflowX: mobile ? 'auto' : undefined,
      position: mobile ? undefined : 'sticky',
      top: mobile ? undefined : 0,
      alignSelf: 'flex-start',
      ...style
    }
  }, items.map(it => {
    const on = it.value === value;
    return /*#__PURE__*/React.createElement("button", {
      key: it.value,
      type: "button",
      onClick: () => onChange && onChange(it.value),
      style: mobile ? {
        display: 'inline-flex',
        alignItems: 'center',
        height: '30px',
        padding: '0 11px',
        flex: 'none',
        border: '1px solid ' + (on ? 'var(--line)' : 'transparent'),
        borderRadius: 'var(--radius-control)',
        background: on ? 'var(--surface)' : 'transparent',
        color: on ? 'var(--ink)' : 'var(--ink-2)',
        fontFamily: 'var(--font-sans)',
        fontSize: '13px',
        fontWeight: on ? 600 : 500,
        cursor: 'pointer',
        whiteSpace: 'nowrap'
      } : {
        display: 'flex',
        alignItems: 'center',
        height: '30px',
        padding: '0 10px',
        border: 0,
        borderLeft: '2px solid ' + (on ? 'var(--ink)' : 'transparent'),
        background: 'transparent',
        color: on ? 'var(--ink)' : 'var(--ink-2)',
        fontFamily: 'var(--font-sans)',
        fontSize: '13px',
        fontWeight: on ? 600 : 500,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'color var(--dur-fast) var(--ease)'
      }
    }, it.label);
  }));
}
Object.assign(__ds_scope, { SubNav });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/SubNav.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
/* Meetrao — underline tabs on a bottom border. Active tab gets a 2px ink underline
   pulled onto the container border. */
function Tabs({
  tabs = [],
  value,
  onChange,
  right,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: '12px',
      borderBottom: '1px solid var(--line)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '2px'
    }
  }, tabs.map(t => {
    const on = t.value === value;
    return /*#__PURE__*/React.createElement("button", {
      key: t.value,
      type: "button",
      onClick: () => onChange && onChange(t.value),
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '7px',
        height: '34px',
        padding: '0 12px',
        marginBottom: '-1px',
        border: 0,
        borderBottom: '2px solid ' + (on ? 'var(--ink)' : 'transparent'),
        background: 'transparent',
        color: on ? 'var(--ink)' : 'var(--ink-2)',
        fontFamily: 'var(--font-sans)',
        fontSize: '13.5px',
        fontWeight: 600,
        cursor: 'pointer'
      }
    }, /*#__PURE__*/React.createElement("span", null, t.label), t.count != null ? /*#__PURE__*/React.createElement(__ds_scope.CountBadge, {
      active: on
    }, t.count) : null);
  })), right ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: '8px'
    }
  }, right) : null);
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/scheduling/BookingLinkChip.jsx
try { (() => {
/* Meetrao — a copyable booking link. Mono text on --fill, with a copy glyph that becomes
   a check for 1800ms after copying. */
function BookingLinkChip({
  link,
  maxWidth = 168,
  onCopy,
  style
}) {
  const [copied, setCopied] = React.useState(false);
  const [hover, setHover] = React.useState(false);
  const copy = () => {
    setCopied(true);
    if (onCopy) onCopy(link);
    setTimeout(() => setCopied(false), 1800);
  };
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: copy,
    title: "Copy link",
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '7px',
      maxWidth: maxWidth + 'px',
      height: '26px',
      padding: '0 8px',
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius-xs)',
      background: hover ? 'var(--fill-2)' : 'var(--fill)',
      color: hover ? 'var(--ink)' : 'var(--ink-2)',
      fontFamily: 'var(--font-mono)',
      fontSize: '11.5px',
      cursor: 'pointer',
      transition: 'background var(--dur-fast) var(--ease)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 0,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, link), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-icon)',
      fontWeight: copied ? 900 : 300,
      fontSize: '10px',
      flex: 'none',
      color: copied ? 'var(--accent)' : 'inherit'
    }
  }, copied ? '\uf00c' : '\uf0c5'));
}
Object.assign(__ds_scope, { BookingLinkChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/scheduling/BookingLinkChip.jsx", error: String((e && e.message) || e) }); }

// components/scheduling/CopyLinkButton.jsx
try { (() => {
/* Meetrao — the header "Copy link" control. One button when there is a single link;
   a dropdown listing "All meetings" plus every active meeting when there are more. */
function CopyLinkButton({
  links = [],
  onCopy,
  style
}) {
  const [open, setOpen] = React.useState(false);
  const [copied, setCopied] = React.useState('');
  const [hover, setHover] = React.useState(false);
  const rootRef = React.useRef(null);
  const isMenu = links.length > 1;
  React.useEffect(() => {
    if (!open) return;
    const out = e => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', out, true);
    return () => document.removeEventListener('mousedown', out, true);
  }, [open]);
  const doCopy = l => {
    setCopied(l.link);
    setOpen(false);
    if (onCopy) onCopy(l.link);
    setTimeout(() => setCopied(''), 1800);
  };
  const justCopied = !isMenu && copied;
  return /*#__PURE__*/React.createElement("div", {
    ref: rootRef,
    style: {
      position: 'relative',
      ...style
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-expanded": open,
    onClick: () => isMenu ? setOpen(!open) : doCopy(links[0] || {
      link: ''
    }),
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '7px',
      height: '32px',
      padding: '0 11px',
      border: '1px solid var(--line-strong)',
      borderRadius: 'var(--radius-control)',
      background: hover ? 'var(--fill)' : 'var(--surface)',
      color: 'var(--ink)',
      fontFamily: 'var(--font-sans)',
      fontSize: '12.5px',
      fontWeight: 600,
      cursor: 'pointer',
      whiteSpace: 'nowrap'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: justCopied ? 'check' : 'copy',
    solid: !!justCopied,
    size: 11,
    color: justCopied ? 'var(--accent)' : 'currentColor'
  }), /*#__PURE__*/React.createElement("span", null, justCopied ? 'Copied' : 'Copy link'), isMenu ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron",
    size: 10,
    color: "var(--ink-3)",
    style: {
      transition: 'transform var(--dur-base) var(--ease)',
      transform: 'rotate(' + (open ? '180deg' : '0deg') + ')'
    }
  }) : null), open ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 'calc(100% + 6px)',
      right: 0,
      minWidth: '272px',
      zIndex: 90,
      background: 'var(--surface)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius-card)',
      boxShadow: 'var(--pop)',
      padding: '6px',
      animation: 'mu-in var(--dur-fast) var(--ease) both'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Eyebrow, {
    size: 10,
    style: {
      display: 'block',
      padding: '6px 8px 7px'
    }
  }, "Copy a booking link"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '2px'
    }
  }, links.map(l => /*#__PURE__*/React.createElement("button", {
    key: l.link,
    type: "button",
    onClick: () => doCopy(l),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      width: '100%',
      boxSizing: 'border-box',
      padding: '7px 8px',
      border: 0,
      borderRadius: 'var(--radius-xs)',
      background: 'transparent',
      cursor: 'pointer',
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: '1px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13px',
      fontWeight: 600,
      color: 'var(--ink)'
    }
  }, l.name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '11px',
      color: 'var(--ink-3)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, l.link)), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: copied === l.link ? 'check' : 'copy',
    solid: copied === l.link,
    size: 11,
    color: copied === l.link ? 'var(--accent)' : 'var(--ink-3)'
  }))))) : null);
}
Object.assign(__ds_scope, { CopyLinkButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/scheduling/CopyLinkButton.jsx", error: String((e && e.message) || e) }); }

// components/scheduling/DatePicker.jsx
try { (() => {
/* Meetrao — the public booking calendar. Mono day initials, 38px cells, and a legend
   naming the three states. Weekends and out-of-window days are unclickable at 45% opacity. */
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
function cellStyle(kind) {
  const base = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '38px',
    borderRadius: 'var(--radius-control)',
    fontFamily: 'var(--font-sans)',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'background var(--dur-fast) var(--ease),border-color var(--dur-fast) var(--ease)'
  };
  if (kind === 'empty') return {
    ...base,
    border: '1px solid transparent',
    background: 'transparent',
    color: 'transparent',
    pointerEvents: 'none'
  };
  if (kind === 'disabled') return {
    ...base,
    border: '1px solid transparent',
    background: 'transparent',
    color: 'var(--ink-3)',
    opacity: 0.45,
    cursor: 'not-allowed'
  };
  if (kind === 'selected') return {
    ...base,
    border: '1px solid var(--accent)',
    background: 'var(--accent)',
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer'
  };
  if (kind === 'today') return {
    ...base,
    border: '1px solid var(--accent)',
    background: 'var(--surface)',
    color: 'var(--accent)',
    fontWeight: 600,
    cursor: 'pointer'
  };
  return {
    ...base,
    border: '1px solid var(--line)',
    background: 'var(--surface)',
    color: 'var(--ink)',
    cursor: 'pointer'
  };
}
function DatePicker({
  monthLabel,
  firstDow = 0,
  daysInMonth = 30,
  minDay = 1,
  maxDay = 31,
  today,
  selected,
  onSelect,
  onPrev,
  onNext,
  prevDisabled = false,
  nextDisabled = false,
  closedDows = [0, 6],
  legend = true,
  style
}) {
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push({
    key: 'e' + i,
    label: '',
    kind: 'empty'
  });
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = (firstDow + d - 1) % 7;
    const closed = closedDows.indexOf(dow) >= 0 || d < minDay || d > maxDay;
    const kind = closed ? 'disabled' : selected === d ? 'selected' : today === d ? 'today' : 'open';
    cells.push({
      key: 'd' + d,
      label: String(d),
      kind,
      day: d,
      closed
    });
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Eyebrow, {
    style: {
      whiteSpace: 'nowrap'
    }
  }, "Select a date"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    glyph: '\uf053',
    tone: "outline",
    size: 28,
    title: "Previous month",
    disabled: prevDisabled,
    onClick: onPrev
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: '118px',
      textAlign: 'center',
      fontSize: '13.5px',
      fontWeight: 600,
      color: 'var(--ink)'
    }
  }, monthLabel), /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    glyph: '\uf054',
    tone: "outline",
    size: 28,
    title: "Next month",
    disabled: nextDisabled,
    onClick: onNext
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(7,1fr)',
      gap: '5px'
    }
  }, DOW.map((w, i) => /*#__PURE__*/React.createElement("span", {
    key: 'w' + i,
    style: {
      textAlign: 'center',
      paddingBottom: '2px',
      fontFamily: 'var(--font-mono)',
      fontSize: '10px',
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      color: 'var(--ink-3)'
    }
  }, w)), cells.map(c => /*#__PURE__*/React.createElement("button", {
    key: c.key,
    type: "button",
    disabled: c.kind === 'empty' || c.closed,
    onClick: () => {
      if (!c.closed && onSelect) onSelect(c.day);
    },
    style: cellStyle(c.kind)
  }, c.label))), legend ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '14px',
      paddingTop: '2px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '11.5px',
      color: 'var(--ink-3)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: '9px',
      height: '9px',
      border: '1px solid var(--accent)',
      borderRadius: '3px'
    }
  }), "Today"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '11.5px',
      color: 'var(--ink-3)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: '9px',
      height: '9px',
      background: 'var(--accent)',
      borderRadius: '3px'
    }
  }), "Selected"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '11.5px',
      color: 'var(--ink-3)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: '9px',
      height: '9px',
      border: '1px solid var(--line)',
      borderRadius: '3px'
    }
  }), "Available")) : null);
}
Object.assign(__ds_scope, { DatePicker });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/scheduling/DatePicker.jsx", error: String((e && e.message) || e) }); }

// components/scheduling/DayHoursRow.jsx
try { (() => {
/* Meetrao — one weekday in the availability editor: a 136px day toggle, then its time
   ranges (two 110px selects with "to" between them), then "Add hours".
   A disabled day sits on --fill and reads "Unavailable". */
function DayHoursRow({
  label,
  on = true,
  ranges = [],
  times = [],
  first = false,
  onToggle,
  onChangeStart,
  onChangeEnd,
  onRemove,
  onAdd,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'flex-start',
      gap: '14px',
      padding: '11px 15px',
      borderTop: first ? undefined : '1px solid var(--line-soft)',
      background: on ? 'transparent' : 'var(--fill)',
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Checkbox, {
    checked: on,
    onChange: onToggle,
    label: label,
    width: 136
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: '200px',
      display: 'flex',
      flexDirection: 'column',
      gap: '7px'
    }
  }, on ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '7px'
    }
  }, ranges.map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '7px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '110px'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.MenuSelect, {
    size: "sm",
    options: times,
    value: r.start,
    onChange: v => onChangeStart && onChangeStart(i, v)
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12px',
      color: 'var(--ink-3)'
    }
  }, "to"), /*#__PURE__*/React.createElement("div", {
    style: {
      width: '110px'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.MenuSelect, {
    size: "sm",
    options: times,
    value: r.end,
    onChange: v => onChangeEnd && onChangeEnd(i, v)
  })), /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    name: "close",
    tone: "danger",
    title: "Remove",
    onClick: () => onRemove && onRemove(i)
  }))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onAdd,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      alignSelf: 'flex-start',
      height: '24px',
      padding: '0 7px',
      border: '1px solid transparent',
      borderRadius: 'var(--radius-xs)',
      background: 'transparent',
      color: 'var(--accent)',
      fontFamily: 'var(--font-sans)',
      fontSize: '12.5px',
      fontWeight: 600,
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-icon)',
      fontWeight: 300,
      fontSize: '10px'
    }
  }, "+"), "Add hours")) : /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13px',
      color: 'var(--ink-3)'
    }
  }, "Unavailable")));
}
Object.assign(__ds_scope, { DayHoursRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/scheduling/DayHoursRow.jsx", error: String((e && e.message) || e) }); }

// components/scheduling/SlotGrid.jsx
try { (() => {
/* Meetrao — the available-times grid. 38px buttons, auto-fill minmax(96px,1fr), 6px gap. */
function SlotGrid({
  slots = [],
  selected,
  onSelect,
  style
}) {
  const [hover, setHover] = React.useState('');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill,minmax(96px,1fr))',
      gap: '6px',
      ...style
    }
  }, slots.map(s => {
    const on = s === selected;
    const hot = hover === s;
    return /*#__PURE__*/React.createElement("button", {
      key: s,
      type: "button",
      onClick: () => onSelect && onSelect(s),
      onMouseEnter: () => setHover(s),
      onMouseLeave: () => setHover(''),
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '38px',
        padding: '0 10px',
        borderRadius: 'var(--radius-control)',
        fontFamily: 'var(--font-sans)',
        fontSize: '13px',
        fontWeight: on ? 600 : 500,
        cursor: 'pointer',
        border: '1px solid ' + (on ? 'var(--accent)' : hot ? 'var(--accent)' : 'var(--line-strong)'),
        background: on ? hot ? 'var(--accent-2)' : 'var(--accent)' : hot ? 'var(--fill)' : 'var(--surface)',
        color: on ? '#fff' : 'var(--ink)',
        transition: 'background var(--dur-fast) var(--ease),border-color var(--dur-fast) var(--ease)'
      }
    }, s.replace(/^0/, ''));
  }));
}
Object.assign(__ds_scope, { SlotGrid });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/scheduling/SlotGrid.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/AppShell.jsx
try { (() => {
/* Meetrao app shell — 218px sidebar, --ground header with the centred 1120px column,
   scrolling content. Recreated from Meetrao.dc.html. */
const {
  NavItem,
  Avatar,
  IconButton,
  Breadcrumb
} = window.MeetraoDesignSystem_9aa8b5;
const NAV = [{
  key: 'dash',
  label: 'Dashboard',
  icon: 'home'
}, {
  key: 'bookings',
  label: 'Bookings',
  icon: 'calendar'
}, {
  key: 'meetings',
  label: 'Meetings',
  icon: 'list'
}, {
  key: 'avail',
  label: 'Availability',
  icon: 'clock'
}, {
  key: 'settings',
  label: 'Settings',
  icon: 'gear'
}];
function AppShell({
  screen,
  onNavigate,
  counts = {},
  header,
  children
}) {
  const u = window.MR_DATA.user;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'stretch',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--ground)'
    }
  }, /*#__PURE__*/React.createElement("nav", {
    style: {
      flex: 'none',
      width: '218px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      padding: '14px 12px 58px',
      borderRight: '1px solid var(--line)',
      background: 'var(--sidebar)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '8px',
      padding: '2px 4px 16px'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/meetrao-logo.svg",
    alt: "Meetrao",
    style: {
      height: '20px',
      width: 'auto'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
      flex: 1,
      minHeight: 0,
      overflowY: 'auto'
    }
  }, NAV.map(n => /*#__PURE__*/React.createElement(NavItem, {
    key: n.key,
    icon: n.icon,
    label: n.label,
    count: counts[n.key] != null ? counts[n.key] : null,
    active: screen === n.key || n.key === 'meetings' && screen === 'meetingEdit',
    onClick: () => onNavigate(n.key)
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '9px',
      flex: 'none',
      padding: '12px 4px 2px',
      borderTop: '1px solid var(--line)'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: u.name,
    size: 26
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12.5px',
      fontWeight: 600,
      color: 'var(--ink)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, u.name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '11.5px',
      color: 'var(--ink-3)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, u.email)), /*#__PURE__*/React.createElement(IconButton, {
    name: "sign-out",
    title: "Log out"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--ground)'
    }
  }, header, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      overflowY: 'auto',
      background: 'var(--ground)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: '1120px',
      margin: '0 auto',
      padding: '24px 26px 90px'
    }
  }, children))));
}

/* Page header for every screen but the dashboard: optional breadcrumb, title,
   subtitle, right-aligned actions. */
function PageHeader({
  crumb,
  title,
  subtitle,
  actions,
  tall = false,
  children
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      flex: 'none',
      borderBottom: '1px solid var(--line)',
      background: 'var(--ground)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: '1120px',
      margin: '0 auto',
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: '14px',
      padding: tall ? '46px 26px 16px' : '16px 26px'
    }
  }, children || /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
      minWidth: 0
    }
  }, crumb, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontSize: '19px',
      fontWeight: 600,
      letterSpacing: '-0.012em',
      lineHeight: 1.35,
      color: 'var(--ink)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, title), subtitle ? /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: '12.5px',
      color: 'var(--ink-2)'
    }
  }, subtitle) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      flexWrap: 'wrap'
    }
  }, actions)));
}
Object.assign(window, {
  AppShell,
  PageHeader,
  MR_NAV: NAV
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/AppShell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/AvailabilityScreen.jsx
try { (() => {
/* Availability — timezone, the seven-day editor, and a dirty/saved footer. */
const {
  Field,
  MenuSelect,
  Card,
  DayHoursRow,
  Button
} = window.MeetraoDesignSystem_9aa8b5;
function AvailabilityScreen({
  days,
  setDays,
  tz,
  setTz,
  dirty,
  setDirty,
  onSave,
  saving
}) {
  const D = window.MR_DATA;
  const edit = fn => {
    setDays(fn);
    setDirty(true);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      maxWidth: '660px',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '18px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'flex-end',
      gap: '16px',
      paddingBottom: '18px',
      borderBottom: '1px solid var(--line)'
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Timezone",
    style: {
      flex: 1,
      minWidth: '220px'
    }
  }, /*#__PURE__*/React.createElement(MenuSelect, {
    searchable: true,
    options: D.timezones,
    value: tz,
    onChange: v => {
      setTz(v);
      setDirty(true);
    }
  })), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      flex: 1,
      minWidth: '200px',
      fontSize: '12.5px',
      lineHeight: 1.5,
      color: 'var(--ink-3)',
      textWrap: 'pretty'
    }
  }, "Guests always see these hours converted into their own timezone.")), /*#__PURE__*/React.createElement(Card, null, days.map((d, di) => /*#__PURE__*/React.createElement(DayHoursRow, {
    key: d.key,
    first: di === 0,
    label: d.label,
    on: d.on,
    ranges: d.ranges,
    times: D.times,
    onToggle: () => edit(ds => ds.map((x, i) => i === di ? {
      ...x,
      on: !x.on
    } : x)),
    onChangeStart: (ri, v) => edit(ds => ds.map((x, i) => i === di ? {
      ...x,
      ranges: x.ranges.map((y, j) => j === ri ? {
        ...y,
        start: v
      } : y)
    } : x)),
    onChangeEnd: (ri, v) => edit(ds => ds.map((x, i) => i === di ? {
      ...x,
      ranges: x.ranges.map((y, j) => j === ri ? {
        ...y,
        end: v
      } : y)
    } : x)),
    onRemove: ri => edit(ds => ds.map((x, i) => i === di ? {
      ...x,
      ranges: x.ranges.filter((y, j) => j !== ri),
      on: x.ranges.length > 1
    } : x)),
    onAdd: () => edit(ds => ds.map((x, i) => i === di ? {
      ...x,
      ranges: x.ranges.concat([{
        start: '02:00 PM',
        end: '05:00 PM'
      }])
    } : x))
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: '12px'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "xl",
    loading: saving,
    onClick: onSave
  }, saving ? 'Saving…' : 'Save availability'), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12.5px',
      fontWeight: dirty ? 400 : 600,
      color: dirty ? 'var(--ink-3)' : 'var(--accent)'
    }
  }, dirty ? 'Unsaved changes' : 'All changes saved')));
}
Object.assign(window, {
  AvailabilityScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/AvailabilityScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/BookingsScreen.jsx
try { (() => {
/* Bookings — Upcoming / Past tabs with counts, live search, one table. */
const {
  Tabs,
  SearchField,
  DataTable,
  Badge,
  Button,
  EmptyState
} = window.MeetraoDesignSystem_9aa8b5;
const BOOKING_COLS = [{
  key: 'guest',
  label: 'Guest'
}, {
  key: 'type',
  label: 'Meeting'
}, {
  key: 'dateLabel',
  label: 'Date',
  nowrap: true
}, {
  key: 'timeRange',
  label: 'Time',
  nowrap: true
}, {
  key: 'status',
  label: 'Status'
}, {
  key: 'actions',
  label: '',
  align: 'right'
}];
function BookingsScreen({
  bookings,
  onOpenBooking,
  onJoin
}) {
  const [tab, setTab] = React.useState('upcoming');
  const [q, setQ] = React.useState('');
  const source = bookings.filter(b => tab === 'upcoming' ? !b.past : b.past);
  const query = q.trim().toLowerCase();
  const rows = source.filter(b => !query || (b.guest + ' ' + b.email).toLowerCase().indexOf(query) >= 0).map(b => ({
    ...b,
    key: b.id
  }));
  const cell = (row, col) => {
    if (col.key === 'guest') return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '13.5px',
        fontWeight: 600,
        color: 'var(--ink)'
      }
    }, row.guest), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '12px',
        color: 'var(--ink-3)'
      }
    }, row.email));
    if (col.key === 'type') return /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--ink-2)'
      }
    }, row.type);
    if (col.key === 'timeRange') return /*#__PURE__*/React.createElement("span", null, row.timeRange, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--ink-3)'
      }
    }, " \xB7 ", row.duration, "m"));
    if (col.key === 'status') return /*#__PURE__*/React.createElement(Badge, {
      tone: row.cancelled ? 'bad' : 'ok'
    }, row.cancelled ? 'Cancelled' : 'Confirmed');
    if (col.key === 'actions') return /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        gap: '4px',
        justifyContent: 'flex-end'
      }
    }, !row.cancelled && !row.past ? /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "xs",
      onClick: onJoin
    }, "Join") : null, /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      size: "xs",
      onClick: () => onOpenBooking(row.id)
    }, "Details"));
    return row[col.key];
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '15px'
    }
  }, /*#__PURE__*/React.createElement(Tabs, {
    value: tab,
    onChange: setTab,
    tabs: [{
      value: 'upcoming',
      label: 'Upcoming',
      count: bookings.filter(b => !b.past).length
    }, {
      value: 'past',
      label: 'Past',
      count: bookings.filter(b => b.past).length
    }],
    right: /*#__PURE__*/React.createElement(SearchField, {
      value: q,
      onChange: e => setQ(e.target.value),
      placeholder: "Search guest or email..."
    })
  }), rows.length ? /*#__PURE__*/React.createElement(DataTable, {
    columns: BOOKING_COLS,
    rows: rows,
    renderCell: cell,
    minWidth: 700
  }) : /*#__PURE__*/React.createElement(EmptyState, {
    title: query ? 'No matches' : tab === 'past' ? 'Nothing in the past yet' : 'No upcoming bookings',
    text: query ? 'No booking matches that guest or email.' : tab === 'past' ? 'Meetings move here once they have happened.' : 'New bookings will appear here as guests book.'
  }));
}
Object.assign(window, {
  BookingsScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/BookingsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/DashboardScreen.jsx
try { (() => {
/* Dashboard — greeting header, tinted metric strip, Today, Later this week. */
const {
  MetricCard,
  Card,
  ListRow,
  Button,
  Notice,
  EmptyState,
  CopyLinkButton
} = window.MeetraoDesignSystem_9aa8b5;
function DashboardHeader({
  onCopy,
  links,
  now
}) {
  const h = now.getHours();
  const greeting = (h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening') + ', Faisal.';
  return /*#__PURE__*/React.createElement(window.PageHeader, {
    tall: true,
    actions: /*#__PURE__*/React.createElement(CopyLinkButton, {
      links: links,
      onCopy: onCopy
    })
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '7px',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-serif)',
      fontSize: 'clamp(30px,3.4vw,38px)',
      fontWeight: 400,
      letterSpacing: '-0.012em',
      lineHeight: 1.08,
      color: 'var(--ink)'
    }
  }, greeting), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: '9px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '11.5px',
      letterSpacing: '0.04em',
      color: 'var(--ink-2)'
    }
  }, now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      width: '3px',
      height: '3px',
      borderRadius: '50%',
      background: 'var(--line-strong)',
      flex: 'none'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '11.5px',
      letterSpacing: '0.04em',
      color: 'var(--ink-2)'
    }
  }, now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  })))));
}
function DashboardScreen({
  bookings,
  types,
  connected,
  onConnect,
  onOpenBooking,
  onJoin,
  onNew,
  onGoBookings
}) {
  const upcoming = bookings.filter(b => !b.past && !b.cancelled);
  const today = upcoming.filter(b => b.today);
  const later = upcoming.filter(b => !b.today);
  const activeTypes = types.filter(t => t.active);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    }
  }, !connected ? /*#__PURE__*/React.createElement(Notice, {
    tone: "warn",
    title: "Google Calendar isn't connected.",
    action: /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "sm",
      onClick: onConnect
    }, "Connect")
  }, "Meetrao can't check for conflicts or add bookings to your calendar.") : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(196px,1fr))',
      gap: '12px'
    }
  }, /*#__PURE__*/React.createElement(MetricCard, {
    tone: "accent",
    icon: "calendar",
    value: String(upcoming.length),
    label: "Upcoming",
    note: upcoming.length ? 'Through ' + (later.length ? later[later.length - 1].dayLabel : 'today') : 'Nothing booked yet',
    trend: today.length ? today.length + ' today' : ''
  }), /*#__PURE__*/React.createElement(MetricCard, {
    tone: "slate",
    icon: "clock",
    value: today.length ? today[0].timeRange.split(' – ')[0] : '—',
    label: "Next meeting",
    note: today.length ? 'with ' + today[0].guest : 'Free for the rest of today',
    trend: today.length ? 'PM' : ''
  }), /*#__PURE__*/React.createElement(MetricCard, {
    tone: "plain",
    icon: "list",
    value: String(activeTypes.length),
    unit: 'of ' + types.length,
    label: "Active meetings",
    note: "Bookable from your link"
  }), /*#__PURE__*/React.createElement(MetricCard, {
    tone: "amber",
    icon: "bolt",
    value: "1.4",
    unit: "hrs",
    label: "Avg. reply time",
    note: "From link opened to booked"
  })), today.length ? /*#__PURE__*/React.createElement("section", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '9px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: '9px'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: '14.5px',
      fontWeight: 600,
      color: 'var(--ink)'
    }
  }, "Today"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12.5px',
      color: 'var(--ink-3)'
    }
  }, today.length === 1 ? '1 meeting' : today.length + ' meetings')), /*#__PURE__*/React.createElement(Card, null, today.map((b, i) => /*#__PURE__*/React.createElement(ListRow, {
    key: b.id,
    first: i === 0,
    hoverable: true
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: '112px',
      flex: 'none',
      fontSize: '13px',
      fontWeight: 600,
      color: 'var(--ink)'
    }
  }, b.timeRange), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: '160px',
      display: 'flex',
      flexDirection: 'column',
      gap: '1px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13.5px',
      fontWeight: 600,
      color: 'var(--ink)'
    }
  }, b.guest), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12.5px',
      color: 'var(--ink-3)'
    }
  }, b.type, " \xB7 ", b.duration, " min")), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm",
    onClick: () => onOpenBooking(b.id)
  }, "Details"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm",
    icon: "video",
    onClick: onJoin
  }, "Join"))))) : null, /*#__PURE__*/React.createElement("section", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '9px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: '12px'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: '14.5px',
      fontWeight: 600,
      color: 'var(--ink)'
    }
  }, today.length ? 'Later this week' : 'Upcoming'), /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => {
      e.preventDefault();
      onGoBookings();
    },
    style: {
      fontSize: '12.5px'
    }
  }, "View all")), later.length ? /*#__PURE__*/React.createElement(Card, null, later.map((b, i) => /*#__PURE__*/React.createElement(ListRow, {
    key: b.id,
    first: i === 0,
    hoverable: true
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '112px',
      flex: 'none',
      display: 'flex',
      flexDirection: 'column',
      gap: '1px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13px',
      fontWeight: 600,
      color: 'var(--ink)'
    }
  }, b.dayLabel), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12px',
      color: 'var(--ink-3)'
    }
  }, b.timeRange)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: '160px',
      display: 'flex',
      flexDirection: 'column',
      gap: '1px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13.5px',
      fontWeight: 600,
      color: 'var(--ink)'
    }
  }, b.guest), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12.5px',
      color: 'var(--ink-3)'
    }
  }, b.type, " \xB7 ", b.duration, " min")), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm",
    onClick: () => onOpenBooking(b.id)
  }, "Details")))) : /*#__PURE__*/React.createElement(EmptyState, {
    title: "No upcoming meetings",
    text: "Your scheduled meetings will appear here.",
    action: /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "md",
      icon: "plus",
      onClick: onNew
    }, "Create meeting")
  })));
}
Object.assign(window, {
  DashboardScreen,
  DashboardHeader
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/DashboardScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/MeetingsScreen.jsx
try { (() => {
/* Meetings (meeting types) — the table, plus the create/edit form. */
const {
  DataTable,
  Switch,
  Button,
  BookingLinkChip,
  Field,
  Input,
  Textarea,
  ChoiceChip,
  MenuSelect,
  Icon,
  Breadcrumb
} = window.MeetraoDesignSystem_9aa8b5;
const MEETING_COLS = [{
  key: 'name',
  label: 'Meeting',
  width: '36%',
  minWidth: '230px'
}, {
  key: 'duration',
  label: 'Duration',
  nowrap: true
}, {
  key: 'link',
  label: 'Booking link'
}, {
  key: 'active',
  label: 'Active'
}, {
  key: 'actions',
  label: '',
  align: 'right'
}];
function MeetingsScreen({
  types,
  onToggle,
  onEdit,
  onPreview,
  onCopy
}) {
  const rows = types.map(t => ({
    ...t,
    key: t.id
  }));
  const cell = (row, col) => {
    if (col.key === 'name') return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        maxWidth: '270px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '13.5px',
        fontWeight: 600,
        color: row.active ? 'var(--ink)' : 'var(--ink-2)'
      }
    }, row.name), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '12.5px',
        lineHeight: 1.45,
        color: 'var(--ink-3)',
        textWrap: 'pretty'
      }
    }, row.desc));
    if (col.key === 'duration') return /*#__PURE__*/React.createElement("span", null, row.duration, " min");
    if (col.key === 'link') return /*#__PURE__*/React.createElement(BookingLinkChip, {
      link: 'meetrao.com/faisal/' + row.slug,
      onCopy: onCopy
    });
    if (col.key === 'active') return /*#__PURE__*/React.createElement(Switch, {
      checked: row.active,
      onChange: () => onToggle(row.id)
    });
    if (col.key === 'actions') return /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        gap: '4px',
        justifyContent: 'flex-end'
      }
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      size: "xs",
      onClick: () => onPreview(row.id)
    }, "Preview"), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "xs",
      onClick: () => onEdit(row.id)
    }, "Edit"));
    return row[col.key];
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }
  }, /*#__PURE__*/React.createElement(DataTable, {
    columns: MEETING_COLS,
    rows: rows,
    renderCell: cell,
    minWidth: 640
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12.5px',
      color: 'var(--ink-3)'
    }
  }, "Inactive meetings stay in this list but can't be booked from your link."));
}
const SectionHead = ({
  title,
  text
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  }
}, /*#__PURE__*/React.createElement("h2", {
  style: {
    margin: 0,
    fontSize: '14.5px',
    fontWeight: 600,
    color: 'var(--ink)'
  }
}, title), text ? /*#__PURE__*/React.createElement("p", {
  style: {
    margin: 0,
    fontSize: '12.5px',
    color: 'var(--ink-3)'
  }
}, text) : null);
function MeetingEditScreen({
  editing,
  onCancel,
  onSave,
  saving
}) {
  const [form, setForm] = React.useState(editing || {
    name: '',
    desc: '',
    duration: '30',
    buffer: '10',
    notice: '60',
    window: '30',
    active: true
  });
  const [touched, setTouched] = React.useState(false);
  const set = (k, v) => setForm(f => ({
    ...f,
    [k]: v
  }));
  const invalid = touched && !String(form.name).trim();
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      maxWidth: '600px',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("section", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      paddingBottom: '20px',
      borderBottom: '1px solid var(--line)'
    }
  }, /*#__PURE__*/React.createElement(SectionHead, {
    title: "Meeting details",
    text: "What guests see when they open your booking link."
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Name",
    error: invalid ? 'Give the meeting a name guests will recognise.' : null
  }, /*#__PURE__*/React.createElement(Input, {
    size: "form",
    value: form.name,
    invalid: invalid,
    onChange: e => set('name', e.target.value)
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Description"
  }, /*#__PURE__*/React.createElement(Textarea, {
    value: form.desc,
    onChange: e => set('desc', e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '7px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12.5px',
      fontWeight: 600,
      color: 'var(--ink)'
    }
  }, "Duration"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '6px',
      flexWrap: 'wrap'
    }
  }, [['15', '15 min'], ['30', '30 min'], ['45', '45 min'], ['60', '60 min']].map(([v, label]) => /*#__PURE__*/React.createElement(ChoiceChip, {
    key: v,
    selected: String(form.duration) === v,
    onClick: () => set('duration', v)
  }, label))))), /*#__PURE__*/React.createElement("section", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '11px',
      padding: '20px 0',
      borderBottom: '1px solid var(--line)'
    }
  }, /*#__PURE__*/React.createElement(SectionHead, {
    title: "Location",
    text: "Every booking gets its own Google Meet link."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '9px',
      height: '36px',
      padding: '0 12px',
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius-control)',
      background: 'var(--fill)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "video",
    size: 13,
    color: "var(--ink-2)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13.5px',
      color: 'var(--ink)'
    }
  }, "Google Meet"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12px',
      color: 'var(--ink-3)',
      marginLeft: 'auto'
    }
  }, "Only option in this release"))), /*#__PURE__*/React.createElement("section", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      padding: '20px 0',
      borderBottom: '1px solid var(--line)'
    }
  }, /*#__PURE__*/React.createElement(SectionHead, {
    title: "Booking rules",
    text: "How close to the hour and how far ahead guests can book."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(164px,1fr))',
      gap: '13px'
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Buffer between meetings"
  }, /*#__PURE__*/React.createElement(MenuSelect, {
    value: form.buffer,
    onChange: v => set('buffer', v),
    options: [{
      value: '0',
      label: 'None'
    }, {
      value: '5',
      label: '5 minutes'
    }, {
      value: '10',
      label: '10 minutes'
    }, {
      value: '15',
      label: '15 minutes'
    }]
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Minimum notice"
  }, /*#__PURE__*/React.createElement(MenuSelect, {
    value: form.notice,
    onChange: v => set('notice', v),
    options: [{
      value: '60',
      label: '1 hour'
    }, {
      value: '120',
      label: '2 hours'
    }, {
      value: '240',
      label: '4 hours'
    }, {
      value: '720',
      label: '12 hours'
    }, {
      value: '1440',
      label: '24 hours'
    }]
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Booking window"
  }, /*#__PURE__*/React.createElement(MenuSelect, {
    value: form.window,
    onChange: v => set('window', v),
    options: [{
      value: '7',
      label: '7 days ahead'
    }, {
      value: '14',
      label: '14 days ahead'
    }, {
      value: '30',
      label: '30 days ahead'
    }, {
      value: '60',
      label: '60 days ahead'
    }]
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      padding: '12px 14px',
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius-card)',
      background: 'var(--surface)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: '2px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13.5px',
      fontWeight: 600,
      color: 'var(--ink)'
    }
  }, "Active"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12.5px',
      color: 'var(--ink-3)'
    }
  }, "Guests can book this meeting from your link.")), /*#__PURE__*/React.createElement(Switch, {
    checked: form.active,
    onChange: () => set('active', !form.active)
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: '10px',
      paddingTop: '18px'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "xl",
    loading: saving,
    onClick: () => {
      if (!String(form.name).trim()) {
        setTouched(true);
        return;
      }
      onSave(form);
    }
  }, saving ? 'Saving…' : editing ? 'Save changes' : 'Create meeting'), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "xl",
    onClick: onCancel
  }, "Cancel")));
}
Object.assign(window, {
  MeetingsScreen,
  MeetingEditScreen,
  MRSectionHead: SectionHead
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/MeetingsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/SettingsScreen.jsx
try { (() => {
/* Settings — sticky sub-nav plus four panels. */
const {
  SubNav,
  Field,
  Input,
  MenuSelect,
  Button,
  Avatar,
  Badge,
  Icon,
  Notice
} = window.MeetraoDesignSystem_9aa8b5;
function SettingsScreen({
  connected,
  onToggleCalendar,
  tz,
  setTz,
  onSave,
  onPassword,
  onDelete,
  saved
}) {
  const [tab, setTab] = React.useState('profile');
  const D = window.MR_DATA;
  const u = D.user;
  const [prof, setProf] = React.useState(u);
  const set = (k, v) => setProf(p => ({
    ...p,
    [k]: v
  }));
  const SectionHead = window.MRSectionHead;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '160px 1fr',
      gap: '34px',
      maxWidth: '780px',
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement(SubNav, {
    value: tab,
    onChange: setTab,
    items: [{
      value: 'profile',
      label: 'Profile'
    }, {
      value: 'calendar',
      label: 'Calendar'
    }, {
      value: 'booking',
      label: 'Booking'
    }, {
      value: 'account',
      label: 'Account'
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0,
      maxWidth: '560px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    }
  }, tab === 'profile' ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '15px'
    }
  }, /*#__PURE__*/React.createElement(SectionHead, {
    title: "Profile",
    text: "How you appear to guests on your booking page."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      paddingBottom: '15px',
      borderBottom: '1px solid var(--line)'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: prof.name,
    size: 42
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "md",
    icon: "camera"
  }, "Upload photo")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(196px,1fr))',
      gap: '13px'
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Name"
  }, /*#__PURE__*/React.createElement(Input, {
    value: prof.name,
    onChange: e => set('name', e.target.value)
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Job title"
  }, /*#__PURE__*/React.createElement(Input, {
    value: prof.title,
    onChange: e => set('title', e.target.value)
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Email"
  }, /*#__PURE__*/React.createElement(Input, {
    value: prof.email,
    onChange: e => set('email', e.target.value)
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Username",
    helper: 'meetrao.com/' + prof.username
  }, /*#__PURE__*/React.createElement(Input, {
    value: prof.username,
    onChange: e => set('username', e.target.value)
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    onClick: onSave
  }, saved ? 'Saved' : 'Save changes'))) : null, tab === 'calendar' ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '15px'
    }
  }, /*#__PURE__*/React.createElement(SectionHead, {
    title: "Calendar",
    text: "Meetrao checks this calendar for conflicts before offering a time."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: '13px',
      padding: '14px 15px',
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius-card)',
      background: 'var(--surface)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "calendar",
    size: 17,
    color: "var(--accent)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: '150px',
      display: 'flex',
      flexDirection: 'column',
      gap: '2px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13.5px',
      fontWeight: 600,
      color: 'var(--ink)'
    }
  }, "Google Calendar"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12.5px',
      color: 'var(--ink-3)'
    }
  }, connected ? u.email : 'Not connected')), /*#__PURE__*/React.createElement(Badge, {
    tone: connected ? 'ok' : 'off'
  }, connected ? 'Connected' : 'Disconnected'), /*#__PURE__*/React.createElement(Button, {
    variant: connected ? 'secondary' : 'primary',
    size: "md",
    onClick: onToggleCalendar
  }, connected ? 'Disconnect' : 'Connect')), /*#__PURE__*/React.createElement(Field, {
    label: "Timezone",
    style: {
      maxWidth: '320px'
    }
  }, /*#__PURE__*/React.createElement(MenuSelect, {
    searchable: true,
    options: D.timezones,
    value: tz,
    onChange: setTz
  }))) : null, tab === 'booking' ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '15px'
    }
  }, /*#__PURE__*/React.createElement(SectionHead, {
    title: "Booking defaults",
    text: "Applied to every new meeting you create."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(186px,1fr))',
      gap: '13px'
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Default duration"
  }, /*#__PURE__*/React.createElement(MenuSelect, {
    value: "30",
    onChange: () => {},
    options: [{
      value: '15',
      label: '15 minutes'
    }, {
      value: '30',
      label: '30 minutes'
    }, {
      value: '45',
      label: '45 minutes'
    }, {
      value: '60',
      label: '60 minutes'
    }]
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Default minimum notice"
  }, /*#__PURE__*/React.createElement(MenuSelect, {
    value: "60",
    onChange: () => {},
    options: [{
      value: '60',
      label: '1 hour'
    }, {
      value: '120',
      label: '2 hours'
    }, {
      value: '240',
      label: '4 hours'
    }, {
      value: '1440',
      label: '24 hours'
    }]
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    onClick: onSave
  }, saved ? 'Saved' : 'Save changes'))) : null, tab === 'account' ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '15px'
    }
  }, /*#__PURE__*/React.createElement(SectionHead, {
    title: "Account",
    text: "Sign-in and account removal."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      padding: '12px 14px',
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius-card)',
      background: 'var(--surface)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: '2px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13.5px',
      fontWeight: 600,
      color: 'var(--ink)'
    }
  }, "Password"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12.5px',
      color: 'var(--ink-3)'
    }
  }, "Last changed 4 months ago.")), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "md",
    onClick: onPassword
  }, "Change")), /*#__PURE__*/React.createElement(Notice, {
    tone: "bad",
    title: "Delete account",
    action: /*#__PURE__*/React.createElement(Button, {
      variant: "danger",
      size: "md",
      onClick: onDelete
    }, "Delete")
  }, "Removes your booking page and cancels every upcoming meeting."), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "lg",
    icon: "sign-out"
  }, "Log out"))) : null));
}
Object.assign(window, {
  SettingsScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/SettingsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/data.js
try { (() => {
/* Mock data lifted from the source prototype. All of it is fabricated. */
window.MR_DATA = {
  user: {
    name: 'Faisal Rahman',
    title: 'Product consultant',
    email: 'faisal@studioatlas.co',
    username: 'faisal'
  },
  bookings: [{
    id: 'b1',
    type: '30 Minute Consultation',
    guest: 'John Smith',
    email: 'john@example.com',
    dateLabel: 'Today',
    dayLabel: 'Today',
    timeRange: '3:00 – 3:30 PM',
    duration: 30,
    today: true,
    past: false,
    note: 'Happy to share the current wireframes beforehand if useful.'
  }, {
    id: 'b2',
    type: 'Project Deep Dive',
    guest: 'Amina Chowdhury',
    email: 'amina@northbridge.io',
    dateLabel: 'Tomorrow',
    dayLabel: 'Tomorrow',
    timeRange: '11:00 – 12:00 PM',
    duration: 60,
    today: false,
    past: false,
    note: ''
  }, {
    id: 'b3',
    type: 'Intro Call',
    guest: 'Dan Whitfield',
    email: 'dan@whitfield.dev',
    dateLabel: 'Mon 7 Sep',
    dayLabel: 'Mon 7 Sep',
    timeRange: '9:30 – 9:45 AM',
    duration: 15,
    today: false,
    past: false,
    note: ''
  }, {
    id: 'b4',
    type: '30 Minute Consultation',
    guest: 'Priya Nair',
    email: 'priya@nairstudio.com',
    dateLabel: '2 Sep',
    dayLabel: '2 Sep',
    timeRange: '4:00 – 4:30 PM',
    duration: 30,
    today: false,
    past: true,
    note: ''
  }, {
    id: 'b5',
    type: 'Intro Call',
    guest: 'Tomás Rivera',
    email: 'tomas@rivera.mx',
    dateLabel: '28 Aug',
    dayLabel: '28 Aug',
    timeRange: '10:00 – 10:15 AM',
    duration: 15,
    today: false,
    past: true,
    cancelled: true,
    note: ''
  }],
  types: [{
    id: 't1',
    name: '30 Minute Consultation',
    desc: 'A quick conversation to discuss your project.',
    duration: 30,
    slug: '30-minute-consultation',
    active: true
  }, {
    id: 't2',
    name: 'Project Deep Dive',
    desc: 'Review scope, timeline and budget in detail.',
    duration: 60,
    slug: 'project-deep-dive',
    active: true
  }, {
    id: 't3',
    name: 'Intro Call',
    desc: "Fifteen minutes to see if we're a fit.",
    duration: 15,
    slug: 'intro-call',
    active: false
  }],
  days: [{
    key: 'mon',
    label: 'Monday',
    on: true,
    ranges: [{
      start: '09:00 AM',
      end: '12:00 PM'
    }, {
      start: '02:00 PM',
      end: '05:00 PM'
    }]
  }, {
    key: 'tue',
    label: 'Tuesday',
    on: true,
    ranges: [{
      start: '09:00 AM',
      end: '05:00 PM'
    }]
  }, {
    key: 'wed',
    label: 'Wednesday',
    on: true,
    ranges: [{
      start: '09:00 AM',
      end: '05:00 PM'
    }]
  }, {
    key: 'thu',
    label: 'Thursday',
    on: true,
    ranges: [{
      start: '09:00 AM',
      end: '05:00 PM'
    }]
  }, {
    key: 'fri',
    label: 'Friday',
    on: true,
    ranges: [{
      start: '09:00 AM',
      end: '03:00 PM'
    }]
  }, {
    key: 'sat',
    label: 'Saturday',
    on: false,
    ranges: [{
      start: '10:00 AM',
      end: '02:00 PM'
    }]
  }, {
    key: 'sun',
    label: 'Sunday',
    on: false,
    ranges: [{
      start: '10:00 AM',
      end: '02:00 PM'
    }]
  }],
  times: ['08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM', '07:00 PM'],
  timezones: [{
    value: 'Asia/Dhaka',
    label: 'GMT+06:00  Dhaka'
  }, {
    value: 'Europe/London',
    label: 'GMT+01:00  London'
  }, {
    value: 'America/New_York',
    label: 'GMT−04:00  New York'
  }, {
    value: 'America/Los_Angeles',
    label: 'GMT−07:00  Los Angeles'
  }, {
    value: 'Australia/Sydney',
    label: 'GMT+10:00  Sydney'
  }]
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/data.js", error: String((e && e.message) || e) }); }

// ui_kits/booking/BookingScreens.jsx
try { (() => {
/* Public guest flow — booking page, guest details, confirmed, cancelled.
   Recreated from Meetrao.dc.html (public screens). */
const {
  Avatar,
  Icon,
  Eyebrow,
  DatePicker,
  SlotGrid,
  Notice,
  Button,
  Field,
  Input,
  Textarea,
  KeyValueRow
} = window.MeetraoDesignSystem_9aa8b5;
const HOST = {
  name: 'Faisal Rahman',
  title: 'Product consultant'
};
const MEETING = {
  name: '30 Minute Consultation',
  desc: 'A quick conversation to discuss your project.',
  duration: 30
};
const SLOTS = ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'];
const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
function PageFrame({
  max = 940,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      minHeight: '100vh',
      boxSizing: 'border-box',
      padding: '20px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      maxWidth: max + 'px',
      margin: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px'
    }
  }, children));
}
function BookingPage({
  date,
  setDate,
  taken,
  onPickSlot,
  slotError
}) {
  const dow = (2 + date - 1) % 7;
  const open = dow !== 0 && dow !== 6;
  const slots = open ? SLOTS.filter(s => taken.indexOf(s) < 0) : [];
  return /*#__PURE__*/React.createElement(PageFrame, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      padding: '0 2px'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/meetrao-logo.svg",
    alt: "Meetrao",
    style: {
      height: '20px',
      width: 'auto'
    }
  }), /*#__PURE__*/React.createElement(Eyebrow, null, "Booking page")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius-surface)',
      overflow: 'hidden',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(290px,1fr))'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '30px',
      background: 'var(--fill)',
      borderRight: '1px solid var(--line)',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '11px'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: HOST.name,
    size: 38
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1px',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13.5px',
      fontWeight: 600,
      color: 'var(--ink)'
    }
  }, HOST.name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12px',
      color: 'var(--ink-3)'
    }
  }, HOST.title))), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-serif)',
      fontSize: '31px',
      fontWeight: 400,
      letterSpacing: '-0.01em',
      lineHeight: 1.08,
      color: 'var(--ink)',
      textWrap: 'pretty'
    }
  }, MEETING.name), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: '13.5px',
      lineHeight: 1.55,
      color: 'var(--ink-2)',
      textWrap: 'pretty'
    }
  }, MEETING.desc), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      paddingTop: '4px',
      marginTop: 'auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "clock",
    size: 13,
    width: 15,
    color: "var(--ink-3)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13px',
      color: 'var(--ink)'
    }
  }, MEETING.duration, " minutes")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "video",
    size: 13,
    width: 15,
    color: "var(--ink-3)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13px',
      color: 'var(--ink)'
    }
  }, "Google Meet")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "globe",
    size: 13,
    width: 15,
    color: "var(--ink-3)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13px',
      lineHeight: 1.45,
      color: 'var(--ink-2)'
    }
  }, "Times shown in GMT+06:00 Dhaka")))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '30px',
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(DatePicker, {
    monthLabel: "September 2026",
    firstDow: 2,
    daysInMonth: 30,
    minDay: 5,
    maxDay: 30,
    today: 5,
    selected: date,
    onSelect: setDate,
    prevDisabled: true,
    nextDisabled: false
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '11px',
      paddingTop: '18px',
      marginTop: '18px',
      borderTop: '1px solid var(--line)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: '8px'
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "Available times"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12.5px',
      color: 'var(--ink-2)'
    }
  }, DOW[dow] + ', September ' + date)), slotError ? /*#__PURE__*/React.createElement(Notice, {
    tone: "bad"
  }, "That time was just booked by someone else. The list below is up to date.") : null, slots.length ? /*#__PURE__*/React.createElement(SlotGrid, {
    slots: slots,
    onSelect: onPickSlot
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      padding: '22px 16px',
      border: '1px dashed var(--line-strong)',
      borderRadius: 'var(--radius-card)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13.5px',
      fontWeight: 600,
      color: 'var(--ink)'
    }
  }, "No times on this day"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12.5px',
      color: 'var(--ink-2)'
    }
  }, "Faisal is not taking bookings then. Try another date."))))));
}
function GuestDetails({
  slot,
  date,
  guest,
  setGuest,
  onSubmit,
  onBack,
  submitting,
  failed,
  onPickAnother
}) {
  const [touched, setTouched] = React.useState(false);
  const dow = (2 + date - 1) % 7;
  const nameBad = touched && !guest.name.trim();
  const emailBad = touched && guest.email.indexOf('@') < 0;
  return /*#__PURE__*/React.createElement(PageFrame, {
    max: 520
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/meetrao-logo.svg",
    alt: "Meetrao",
    style: {
      height: '20px',
      width: 'auto',
      alignSelf: 'flex-start'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius-surface)',
      padding: '30px',
      display: 'flex',
      flexDirection: 'column',
      gap: '22px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-serif)',
      fontSize: '28px',
      fontWeight: 400,
      letterSpacing: '-0.01em',
      lineHeight: 1.1,
      color: 'var(--ink)'
    }
  }, "Confirm your details"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '5px',
      padding: '12px 14px',
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius-card)',
      background: 'var(--fill)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13.5px',
      fontWeight: 600,
      color: 'var(--ink)'
    }
  }, MEETING.name, " \xB7 ", MEETING.duration, " min"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12.5px',
      color: 'var(--ink-2)'
    }
  }, DOW[dow] + ', September ' + date + ' · ' + slot.replace(/^0/, '')))), failed ? /*#__PURE__*/React.createElement(Notice, {
    tone: "bad",
    title: "That time is no longer available",
    action: /*#__PURE__*/React.createElement(Button, {
      variant: "danger",
      size: "md",
      onClick: onPickAnother
    }, "Pick another time")
  }, "Someone booked it while you were filling this in. Nothing has been scheduled.") : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '14px'
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Full name",
    error: nameBad ? 'Faisal needs to know who he is meeting.' : null
  }, /*#__PURE__*/React.createElement(Input, {
    placeholder: "John Smith",
    value: guest.name,
    invalid: nameBad,
    onChange: e => setGuest({
      ...guest,
      name: e.target.value
    })
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Email address",
    helper: "The confirmation and Meet link go here.",
    error: emailBad ? 'Enter an email we can send the confirmation to.' : null
  }, /*#__PURE__*/React.createElement(Input, {
    placeholder: "you@company.com",
    value: guest.email,
    invalid: emailBad,
    onChange: e => setGuest({
      ...guest,
      email: e.target.value
    })
  })), /*#__PURE__*/React.createElement(Field, {
    label: /*#__PURE__*/React.createElement("span", null, "Note ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 400,
        color: 'var(--ink-3)'
      }
    }, "(optional)"))
  }, /*#__PURE__*/React.createElement(Textarea, {
    placeholder: "Anything Faisal should know beforehand?",
    value: guest.note,
    onChange: e => setGuest({
      ...guest,
      note: e.target.value
    })
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "cta",
    fullWidth: true,
    loading: submitting,
    onClick: () => {
      if (!guest.name.trim() || guest.email.indexOf('@') < 0) {
        setTouched(true);
        return;
      }
      onSubmit();
    }
  }, submitting ? 'Scheduling…' : 'Schedule meeting'), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "xl",
    fullWidth: true,
    icon: "arrow-left",
    onClick: onBack
  }, "Back to times"))));
}
function Confirmed({
  guest,
  slot,
  date,
  onCancel
}) {
  const dow = (2 + date - 1) % 7;
  return /*#__PURE__*/React.createElement(PageFrame, {
    max: 520
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/meetrao-logo.svg",
    alt: "Meetrao",
    style: {
      height: '20px',
      width: 'auto',
      alignSelf: 'flex-start'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius-surface)',
      overflow: 'hidden',
      animation: 'mu-in var(--dur-entrance) var(--ease) both'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '30px 30px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '18px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 'none',
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      background: 'var(--accent)',
      color: '#fff'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    solid: true,
    size: 13,
    color: "#fff"
  })), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-serif)',
      fontSize: '30px',
      fontWeight: 400,
      letterSpacing: '-0.01em',
      lineHeight: 1.05,
      color: 'var(--ink)'
    }
  }, "You're booked!")), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: '13.5px',
      lineHeight: 1.55,
      color: 'var(--ink-2)'
    }
  }, "A confirmation is on its way to ", guest.email || 'you@company.com', ". The invite includes the Google Meet link.")), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--line)',
      background: 'var(--fill)',
      padding: '16px 30px',
      display: 'flex',
      flexDirection: 'column',
      gap: '9px'
    }
  }, /*#__PURE__*/React.createElement(KeyValueRow, {
    keyWidth: 82,
    label: "Meeting",
    value: MEETING.name
  }), /*#__PURE__*/React.createElement(KeyValueRow, {
    keyWidth: 82,
    label: "Host",
    value: HOST.name
  }), /*#__PURE__*/React.createElement(KeyValueRow, {
    keyWidth: 82,
    label: "When",
    value: DOW[dow] + ', September ' + date + ' · ' + slot.replace(/^0/, '')
  }), /*#__PURE__*/React.createElement(KeyValueRow, {
    keyWidth: 82,
    label: "Duration",
    value: MEETING.duration + ' minutes'
  }), /*#__PURE__*/React.createElement(KeyValueRow, {
    keyWidth: 82,
    label: "Where",
    value: "meet.google.com/xrq-hvzp-nkd",
    mono: true
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '22px 30px 26px',
      borderTop: '1px solid var(--line)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ink",
    size: "cta",
    fullWidth: true,
    icon: "video"
  }, "Join Google Meet"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "xl",
    icon: "calendar",
    style: {
      flex: 1,
      minWidth: '150px'
    }
  }, "Add to Google Calendar"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "xl",
    icon: "download"
  }, ".ics")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12.5px',
      lineHeight: 1.5,
      color: 'var(--ink-3)'
    }
  }, "Need to change plans? ", /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => {
      e.preventDefault();
      onCancel();
    }
  }, "Cancel this meeting"), "."))));
}
function Cancelled({
  date,
  onRebook
}) {
  return /*#__PURE__*/React.createElement(PageFrame, {
    max: 460
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/meetrao-logo.svg",
    alt: "Meetrao",
    style: {
      height: '20px',
      width: 'auto',
      alignSelf: 'flex-start'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius-surface)',
      padding: '30px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 'none',
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      background: 'var(--red-soft)',
      border: '1px solid var(--red-line)',
      color: 'var(--red)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "close",
    solid: true,
    size: 12,
    color: "currentColor"
  })), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-serif)',
      fontSize: '27px',
      fontWeight: 400,
      letterSpacing: '-0.01em',
      lineHeight: 1.1,
      color: 'var(--ink)'
    }
  }, "Meeting cancelled"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: '13.5px',
      lineHeight: 1.55,
      color: 'var(--ink-2)',
      textWrap: 'pretty'
    }
  }, "Your meeting with ", HOST.name.split(' ')[0], " on September ", date, " is cancelled. The calendar event has been removed and the time is free again."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '10px',
      paddingTop: '2px'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "xl",
    onClick: onRebook
  }, "Book another time"))));
}
Object.assign(window, {
  BookingPage,
  GuestDetails,
  Confirmed,
  Cancelled,
  MR_SLOTS: SLOTS
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/booking/BookingScreens.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.CountBadge = __ds_scope.CountBadge;

__ds_ns.Eyebrow = __ds_scope.Eyebrow;

__ds_ns.MEETRAO_GLYPHS = __ds_scope.MEETRAO_GLYPHS;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Spinner = __ds_scope.Spinner;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.DataTable = __ds_scope.DataTable;

__ds_ns.EmptyState = __ds_scope.EmptyState;

__ds_ns.KeyValueRow = __ds_scope.KeyValueRow;

__ds_ns.ListRow = __ds_scope.ListRow;

__ds_ns.MetricCard = __ds_scope.MetricCard;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.Notice = __ds_scope.Notice;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.ChoiceChip = __ds_scope.ChoiceChip;

__ds_ns.Field = __ds_scope.Field;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.MenuSelect = __ds_scope.MenuSelect;

__ds_ns.SearchField = __ds_scope.SearchField;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Textarea = __ds_scope.Textarea;

__ds_ns.Breadcrumb = __ds_scope.Breadcrumb;

__ds_ns.NavItem = __ds_scope.NavItem;

__ds_ns.StepTracker = __ds_scope.StepTracker;

__ds_ns.SubNav = __ds_scope.SubNav;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.BookingLinkChip = __ds_scope.BookingLinkChip;

__ds_ns.CopyLinkButton = __ds_scope.CopyLinkButton;

__ds_ns.DatePicker = __ds_scope.DatePicker;

__ds_ns.DayHoursRow = __ds_scope.DayHoursRow;

__ds_ns.SlotGrid = __ds_scope.SlotGrid;

})();
