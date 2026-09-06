/* @ds-bundle: {"format":4,"namespace":"AirlyDesignSystem_997ac6","components":[{"name":"FolderTile","sourcePath":"components/brand/FolderTile.jsx"},{"name":"PaperSheet","sourcePath":"components/brand/PaperSheet.jsx"},{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"AvatarGroup","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Divider","sourcePath":"components/core/Divider.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Link","sourcePath":"components/core/Link.jsx"},{"name":"Spinner","sourcePath":"components/core/Spinner.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"Alert","sourcePath":"components/feedback/Alert.jsx"},{"name":"StatusPill","sourcePath":"components/feedback/StatusPill.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"ToastViewport","sourcePath":"components/feedback/Toast.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"FormField","sourcePath":"components/forms/FormField.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"RadioGroup","sourcePath":"components/forms/Radio.jsx"},{"name":"SearchField","sourcePath":"components/forms/SearchField.jsx"},{"name":"SegmentedControl","sourcePath":"components/forms/SegmentedControl.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Slider","sourcePath":"components/forms/Slider.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Textarea","sourcePath":"components/forms/Textarea.jsx"},{"name":"AIRLY_ICONS","sourcePath":"components/icon/Icon.jsx"},{"name":"Icon","sourcePath":"components/icon/Icon.jsx"},{"name":"Card","sourcePath":"components/layout/Card.jsx"},{"name":"CardHeader","sourcePath":"components/layout/Card.jsx"},{"name":"CardBody","sourcePath":"components/layout/Card.jsx"},{"name":"CardFooter","sourcePath":"components/layout/Card.jsx"},{"name":"EmptyState","sourcePath":"components/layout/EmptyState.jsx"},{"name":"ListRow","sourcePath":"components/layout/ListRow.jsx"},{"name":"Panel","sourcePath":"components/layout/Panel.jsx"},{"name":"ProgressBar","sourcePath":"components/layout/ProgressBar.jsx"},{"name":"Skeleton","sourcePath":"components/layout/Skeleton.jsx"},{"name":"Table","sourcePath":"components/layout/Table.jsx"},{"name":"Breadcrumb","sourcePath":"components/navigation/Breadcrumb.jsx"},{"name":"NavItem","sourcePath":"components/navigation/NavItem.jsx"},{"name":"Pagination","sourcePath":"components/navigation/Pagination.jsx"},{"name":"Sidebar","sourcePath":"components/navigation/Sidebar.jsx"},{"name":"SidebarGroup","sourcePath":"components/navigation/Sidebar.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"},{"name":"Toolbar","sourcePath":"components/navigation/Toolbar.jsx"},{"name":"TopBar","sourcePath":"components/navigation/TopBar.jsx"},{"name":"Drawer","sourcePath":"components/overlays/Drawer.jsx"},{"name":"Menu","sourcePath":"components/overlays/Menu.jsx"},{"name":"Modal","sourcePath":"components/overlays/Modal.jsx"},{"name":"Popover","sourcePath":"components/overlays/Popover.jsx"},{"name":"Tooltip","sourcePath":"components/overlays/Tooltip.jsx"}],"sourceHashes":{"components/brand/FolderTile.jsx":"34ab8923a323","components/brand/PaperSheet.jsx":"5e470b864c7d","components/core/Avatar.jsx":"8c9366d84467","components/core/Badge.jsx":"60cd75a24b5f","components/core/Button.jsx":"14af2de44961","components/core/Divider.jsx":"c12c03bd7431","components/core/IconButton.jsx":"b1a7095aa66a","components/core/Link.jsx":"6abe89c1c274","components/core/Spinner.jsx":"8acda6c62df4","components/core/Tag.jsx":"7d40efd46e94","components/feedback/Alert.jsx":"e1dd2e001aa7","components/feedback/StatusPill.jsx":"a9ed7c8fa02f","components/feedback/Toast.jsx":"b34e48409e90","components/forms/Checkbox.jsx":"c6bd6f589da6","components/forms/FormField.jsx":"9e72467dd07c","components/forms/Input.jsx":"15f6449e562e","components/forms/Radio.jsx":"630885536b3d","components/forms/SearchField.jsx":"631479c8bb77","components/forms/SegmentedControl.jsx":"83758943a051","components/forms/Select.jsx":"195ab3260f91","components/forms/Slider.jsx":"3af2cb69412b","components/forms/Switch.jsx":"30a9e7731cef","components/forms/Textarea.jsx":"fee44cfae47e","components/icon/Icon.jsx":"aa46487fa14b","components/layout/Card.jsx":"fa1e43137d6a","components/layout/EmptyState.jsx":"7dcb60b60f0b","components/layout/ListRow.jsx":"43b35db4dfd1","components/layout/Panel.jsx":"c866c332e077","components/layout/ProgressBar.jsx":"8c8633ca8536","components/layout/Skeleton.jsx":"11a97b515903","components/layout/Table.jsx":"b38e652aa6be","components/navigation/Breadcrumb.jsx":"41e228f3fa1e","components/navigation/NavItem.jsx":"05755dc63c2e","components/navigation/Pagination.jsx":"f71f1a8bf98c","components/navigation/Sidebar.jsx":"9dea408bf333","components/navigation/Tabs.jsx":"bd1d8a1125e4","components/navigation/Toolbar.jsx":"8be223a4ab2d","components/navigation/TopBar.jsx":"29010202dd63","components/overlays/Drawer.jsx":"3a0d6658bda5","components/overlays/Menu.jsx":"7e97127e1957","components/overlays/Modal.jsx":"7e1656c62344","components/overlays/Popover.jsx":"deb5f775834b","components/overlays/Tooltip.jsx":"ae2fdc18817d","ui_kits/airly-app/EditorScreen.jsx":"0eba418f729b","ui_kits/airly-app/HomeScreen.jsx":"28738a46fe55","ui_kits/airly-app/SettingsScreen.jsx":"18cc2c1bd5e1"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.AirlyDesignSystem_997ac6 = window.AirlyDesignSystem_997ac6 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/brand/PaperSheet.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* The brand's document surface: light stock, 3px corners, optional ruled lines and a
   left margin rule. Line rhythm and colours come from the tokens, not from an image. */
function PaperSheet({
  ruled = true,
  margin = false,
  lineHeight = 28,
  pad = 24,
  tone = 'light',
  className = '',
  style,
  children,
  ...rest
}) {
  const dark = tone === 'dark';
  const rule = dark ? 'rgba(201,225,255,0.14)' : 'var(--paper-line)';
  const layers = [];
  if (ruled) layers.push('repeating-linear-gradient(to bottom,transparent 0,transparent ' + (lineHeight - 1) + 'px,' + rule + ' ' + (lineHeight - 1) + 'px,' + rule + ' ' + lineHeight + 'px)');
  if (margin) layers.push('linear-gradient(to right,transparent 0,transparent 47px,rgba(249,112,103,0.35) 47px,rgba(249,112,103,0.35) 48px,transparent 48px)');
  return /*#__PURE__*/React.createElement("div", _extends({
    className: className,
    style: {
      position: 'relative',
      borderRadius: 'var(--radius-xs)',
      background: dark ? 'var(--surface-panel)' : 'var(--surface-card-light)',
      color: dark ? 'var(--text-primary)' : 'var(--text-on-light)',
      fontFamily: 'var(--font-ui)',
      fontSize: 'var(--text-md)',
      lineHeight: lineHeight + 'px',
      padding: pad,
      paddingLeft: margin ? Math.max(pad, 64) : pad,
      boxShadow: dark ? 'inset 0 0 0 1px var(--border-hairline)' : 'var(--shadow-note-card)',
      backgroundImage: layers.join(','),
      backgroundPosition: pad + 'px ' + pad + 'px, 0 0',
      backgroundRepeat: 'repeat, no-repeat',
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { PaperSheet });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/PaperSheet.jsx", error: String((e && e.message) || e) }); }

// components/core/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function initials(name) {
  return String(name || '').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
}
function Avatar({
  name = '',
  src,
  size = 'md',
  square = false,
  color,
  className = '',
  style,
  ...rest
}) {
  const cls = ['ay-avatar', size !== 'md' && 'ay-avatar--' + size, square && 'ay-avatar--square', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls,
    title: name || undefined,
    style: color ? {
      background: color,
      ...style
    } : style
  }, rest), src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name
  }) : initials(name));
}
function AvatarGroup({
  className = '',
  children,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    className: ['ay-avatar-group', className].filter(Boolean).join(' ')
  }, rest), children);
}
Object.assign(__ds_scope, { Avatar, AvatarGroup });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/core/Divider.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Divider({
  orientation = 'horizontal',
  tone = 'default',
  label,
  className = '',
  ...rest
}) {
  if (label) {
    return /*#__PURE__*/React.createElement("div", _extends({
      className: ['ay-divider', 'ay-divider--labelled', className].filter(Boolean).join(' ')
    }, rest), /*#__PURE__*/React.createElement("span", null, label));
  }
  const cls = ['ay-divider', orientation === 'vertical' && 'ay-divider--vertical', tone !== 'default' && 'ay-divider--' + tone, className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("hr", _extends({
    className: cls
  }, rest));
}
Object.assign(__ds_scope, { Divider });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Divider.jsx", error: String((e && e.message) || e) }); }

// components/core/Link.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Link({
  variant = 'default',
  inline = false,
  className = '',
  children,
  ...rest
}) {
  const cls = ['ay-link', variant === 'quiet' && 'ay-link--quiet', inline && 'ay-link--inline', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("a", _extends({
    className: cls
  }, rest), children);
}
Object.assign(__ds_scope, { Link });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Link.jsx", error: String((e && e.message) || e) }); }

// components/core/Spinner.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZE = {
  sm: 14,
  md: 18,
  lg: 26
};
function Spinner({
  size = 'md',
  label = 'Loading',
  className = '',
  style,
  ...rest
}) {
  const px = SIZE[size] || SIZE.md;
  return /*#__PURE__*/React.createElement("span", _extends({
    className: ['ay-spinner', className].filter(Boolean).join(' '),
    role: "status",
    "aria-label": label,
    style: {
      width: px,
      height: px,
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Spinner });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Spinner.jsx", error: String((e && e.message) || e) }); }

// components/forms/Radio.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Radio({
  checked,
  label,
  description,
  disabled = false,
  className = '',
  ...rest
}) {
  const [focused, setFocused] = React.useState(false);
  const cls = ['ay-check', checked && 'ay-check--checked', focused && 'ay-check--focused', disabled && 'ay-check--disabled', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("label", {
    className: cls
  }, /*#__PURE__*/React.createElement("span", {
    className: "ay-check__box ay-check__box--radio"
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "radio",
    className: "ay-check__input",
    checked: checked,
    disabled: disabled,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false)
  }, rest)), /*#__PURE__*/React.createElement("span", {
    className: "ay-check__dot"
  })), label || description ? /*#__PURE__*/React.createElement("span", {
    className: "ay-check__text"
  }, /*#__PURE__*/React.createElement("span", null, label), description ? /*#__PURE__*/React.createElement("span", {
    className: "ay-check__desc"
  }, description) : null) : null);
}
function RadioGroup({
  label,
  name,
  value,
  options = [],
  onChange,
  direction = 'column',
  className = '',
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['ay-field', className].filter(Boolean).join(' '),
    role: "radiogroup",
    "aria-label": typeof label === 'string' ? label : undefined
  }, rest), label ? /*#__PURE__*/React.createElement("span", {
    className: "ay-field__label"
  }, label) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: direction,
      gap: direction === 'row' ? 18 : 10
    }
  }, options.map(o => {
    const opt = typeof o === 'string' ? {
      value: o,
      label: o
    } : o;
    return /*#__PURE__*/React.createElement(Radio, {
      key: opt.value,
      name: name,
      value: opt.value,
      label: opt.label,
      description: opt.description,
      disabled: opt.disabled,
      checked: value === opt.value,
      onChange: () => onChange && onChange(opt.value)
    });
  })));
}
Object.assign(__ds_scope, { Radio, RadioGroup });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Radio.jsx", error: String((e && e.message) || e) }); }

// components/forms/Slider.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Slider({
  min = 0,
  max = 100,
  step = 1,
  value,
  showValue = false,
  format,
  className = '',
  ...rest
}) {
  const pct = Math.round((Number(value) - min) / (max - min) * 100);
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "range",
    className: ['ay-slider', className].filter(Boolean).join(' '),
    min: min,
    max: max,
    step: step,
    value: value,
    style: {
      background: 'linear-gradient(var(--intent-accent),var(--intent-accent)) 0/' + pct + '% 4px no-repeat'
    }
  }, rest)), showValue ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 'var(--text-sm)',
      color: 'var(--text-secondary)',
      minWidth: 34,
      textAlign: 'right',
      fontVariantNumeric: 'tabular-nums'
    }
  }, format ? format(value) : value) : null);
}
Object.assign(__ds_scope, { Slider });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Slider.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Switch({
  checked,
  defaultChecked,
  label,
  size = 'md',
  disabled = false,
  onChange,
  className = '',
  ...rest
}) {
  const [internal, setInternal] = React.useState(Boolean(defaultChecked));
  const [focused, setFocused] = React.useState(false);
  const isControlled = checked !== undefined;
  const on = isControlled ? checked : internal;
  const cls = ['ay-switch', on && 'ay-switch--on', focused && 'ay-switch--focused', size === 'sm' && 'ay-switch--sm', disabled && 'ay-switch--disabled', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("label", {
    className: cls
  }, /*#__PURE__*/React.createElement("span", {
    className: "ay-switch__track"
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    role: "switch",
    checked: on,
    disabled: disabled,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    onChange: e => {
      if (!isControlled) setInternal(e.target.checked);
      if (onChange) onChange(e);
    },
    style: {
      position: 'absolute',
      opacity: 0,
      width: '100%',
      height: '100%',
      margin: 0,
      cursor: 'inherit'
    }
  }, rest)), /*#__PURE__*/React.createElement("span", {
    className: "ay-switch__thumb"
  })), label ? /*#__PURE__*/React.createElement("span", null, label) : null);
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/forms/Textarea.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Textarea({
  invalid = false,
  rows = 4,
  className = '',
  ...rest
}) {
  const cls = ['ay-input', 'ay-input--textarea', invalid && 'ay-input--invalid', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("textarea", _extends({
    className: cls,
    rows: rows,
    "aria-invalid": invalid || undefined
  }, rest));
}
Object.assign(__ds_scope, { Textarea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Textarea.jsx", error: String((e && e.message) || e) }); }

// components/icon/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Airly's icons are Font Awesome 6 Sharp glyphs set as text. Any glyph in the family is
   fair game and all four supplied weights are available (Thin 100, Light 300, Regular 400,
   Solid 900) — the source's own usage is just the convention, not the limit.
   AIRLY_ICONS maps the names the Figma file uses to their codepoints so those render
   without relying on font ligature support. For a glyph that is not in the map, pass its
   codepoint: <Icon code="f0e0" />. */
const AIRLY_ICONS = {
  plus: '\u002b',
  search: '\uf002',
  'magnifying-glass': '\uf002',
  filter: '\uf0b0',
  'circle-xmark': '\uf057',
  'times-circle': '\uf057',
  'circle-check': '\uf058',
  'chevron-right': '\uf054',
  'broom-wide': '\ue5d1',
  pen: '\uf304',
  folder: '\uf07b',
  star: '\uf005',
  'cloud-arrow-up': '\uf0ee',
  'cloud-xmark': '\ue35f',
  ellipsis: '\uf141',
  list: '\uf03a',
  grid: '\ue195',
  house: '\uf015',
  'quote-left': '\uf10d',
  bold: '\uf032',
  italic: '\uf033',
  underline: '\uf0cd',
  strikethrough: '\uf0cc',
  image: '\uf03e',
  link: '\uf0c1',
  code: '\uf121',
  'highlighter-line': '\ue1af',
  'horizontal-rule': '\uf86c',
  table: '\uf0ce',
  /* Added for the systematised component set — same family, high-confidence codepoints. */
  xmark: '\uf00d',
  check: '\uf00c',
  'chevron-left': '\uf053',
  'chevron-down': '\uf078',
  'chevron-up': '\uf077',
  'arrow-right': '\uf061',
  'arrow-left': '\uf060',
  'arrow-up': '\uf062',
  'arrow-down': '\uf063',
  'circle-info': '\uf05a',
  'circle-exclamation': '\uf06a',
  'triangle-exclamation': '\uf071',
  'circle-question': '\uf059',
  trash: '\uf1f8',
  gear: '\uf013',
  'file-lines': '\uf15c',
  file: '\uf15b',
  'clock-rotate-left': '\uf1da',
  clock: '\uf017',
  'share-nodes': '\uf1e0',
  copy: '\uf0c5',
  download: '\uf019',
  upload: '\uf093',
  'folder-open': '\uf07c',
  'folder-plus': '\uf65e',
  clone: '\uf24d',
  user: '\uf007',
  'user-plus': '\uf234',
  users: '\uf0c0',
  camera: '\uf030',
  envelope: '\uf0e0',
  bell: '\uf0f3',
  calendar: '\uf133',
  heading: '\uf1dc',
  cloud: '\uf0c2',
  lock: '\uf023',
  eye: '\uf06e',
  'eye-slash': '\uf070',
  'pen-to-square': '\uf044',
  'floppy-disk': '\uf0c7',
  'rotate-left': '\uf0e2',
  sliders: '\uf1de',
  tag: '\uf02b',
  paperclip: '\uf0c6',
  comment: '\uf075',
  bars: '\uf0c9',
  minus: '\uf068',
  bookmark: '\uf02e',
  print: '\uf02f',
  book: '\uf02d'
};

/* size omitted => the glyph inherits font-size from its container, which is how the
   control classes (.ay-btn__icon, .ay-menu__icon, …) size their icons. */
function Icon({
  name,
  code,
  size,
  weight = 400,
  color,
  style,
  className,
  ...rest
}) {
  const glyph = code ? String.fromCodePoint(parseInt(String(code).replace(/^(0x|\\u|U\+)/i, ''), 16)) : AIRLY_ICONS[name];
  if (!glyph && name && typeof console !== 'undefined') {
    console.warn('[Airly] Icon "' + name + '" is not in AIRLY_ICONS — pass its codepoint instead, e.g. <Icon code="f0e0" />.');
  }
  return /*#__PURE__*/React.createElement("span", _extends({
    className: className,
    "aria-hidden": "true",
    "data-icon": name ?? code,
    style: {
      fontFamily: '"Font Awesome 6 Sharp"',
      fontWeight: weight,
      fontStyle: 'normal',
      fontSize: size,
      lineHeight: 1,
      display: 'inline-block',
      textAlign: 'center',
      color: color,
      ...style
    }
  }, rest), glyph ?? '');
}
Object.assign(__ds_scope, { AIRLY_ICONS, Icon, __ds_default_components_icon_Icon_e7wouz: Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/icon/Icon.jsx", error: String((e && e.message) || e) }); }

// components/brand/FolderTile.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Folder motif: a tab, a body in the folder colour, and a stacked-sheet edge. */
function FolderTile({
  name,
  count,
  color = 'var(--accent-yellow)',
  starred = false,
  onClick,
  className = '',
  style,
  ...rest
}) {
  const interactive = Boolean(onClick);
  return /*#__PURE__*/React.createElement("div", _extends({
    className: className,
    onClick: onClick,
    role: interactive ? 'button' : undefined,
    tabIndex: interactive ? 0 : undefined,
    style: {
      position: 'relative',
      width: 200,
      paddingTop: 12,
      cursor: interactive ? 'pointer' : undefined,
      fontFamily: 'var(--font-ui)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 4,
      left: 100,
      right: 10,
      height: 10,
      borderRadius: '2px 2px 0 0',
      background: 'var(--paper-50)',
      opacity: 0.9
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 7,
      left: 94,
      right: 16,
      height: 8,
      borderRadius: '2px 2px 0 0',
      background: '#fff',
      opacity: 0.72
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 0,
      left: 14,
      width: 74,
      height: 14,
      borderRadius: '3px 3px 0 0',
      background: color,
      filter: 'brightness(0.94)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      gap: 5,
      padding: '14px 14px 16px',
      borderRadius: 'var(--radius-xs)',
      background: color,
      color: 'var(--blue-800)',
      boxShadow: 'var(--shadow-folder)',
      minHeight: 96
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 7
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "folder",
    weight: 900,
    style: {
      fontSize: 13,
      opacity: 0.7
    }
  }), starred ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "star",
    weight: 900,
    style: {
      fontSize: 11,
      marginLeft: 'auto'
    }
  }) : null), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-lg)',
      letterSpacing: 'var(--tracking-heading)',
      lineHeight: 1.2
    }
  }, name), count != null ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-xs)',
      opacity: 0.75
    }
  }, count, " ", count === 1 ? 'document' : 'documents') : null));
}
Object.assign(__ds_scope, { FolderTile });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/FolderTile.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Badge({
  tone = 'neutral-soft',
  size = 'md',
  icon,
  dot = false,
  className = '',
  children,
  ...rest
}) {
  const cls = ['ay-badge', tone !== 'neutral-soft' && 'ay-badge--' + tone, size !== 'md' && 'ay-badge--' + size, dot && 'ay-badge--dot', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    weight: 900,
    style: {
      fontSize: '0.85em'
    }
  }) : null, dot ? null : children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZE = {
  xs: 'ay-btn--xs',
  sm: 'ay-btn--sm',
  md: 'ay-btn--md',
  lg: 'ay-btn--lg'
};
function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconEnd,
  iconWeight = 400,
  loading = false,
  block = false,
  disabled = false,
  as = 'button',
  className = '',
  children,
  ...rest
}) {
  const Tag = as;
  const isDisabled = disabled || loading;
  const cls = ['ay-btn', 'ay-btn--' + variant, SIZE[size] || SIZE.md, block && 'ay-btn--block', loading && 'ay-btn--loading', !children && 'ay-btn--square', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement(Tag, _extends({
    className: cls,
    disabled: Tag === 'button' ? isDisabled : undefined,
    "aria-disabled": Tag === 'button' ? undefined : isDisabled || undefined,
    "aria-busy": loading || undefined
  }, rest), loading ? /*#__PURE__*/React.createElement("span", {
    className: "ay-spinner",
    style: {
      width: '1em',
      height: '1em'
    }
  }) : icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    className: "ay-btn__icon",
    name: icon,
    weight: iconWeight
  }) : null, children ? /*#__PURE__*/React.createElement("span", {
    className: "ay-btn__label"
  }, children) : null, iconEnd && !loading ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    className: "ay-btn__icon",
    name: iconEnd,
    weight: iconWeight
  }) : null);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function IconButton({
  icon,
  label,
  variant = 'ghost',
  size = 'md',
  iconWeight = 400,
  ...rest
}) {
  return /*#__PURE__*/React.createElement(__ds_scope.Button, _extends({
    variant: variant,
    size: size,
    icon: icon,
    iconWeight: iconWeight,
    "aria-label": label,
    title: label
  }, rest));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Tag({
  color,
  selected = false,
  onRemove,
  onClick,
  className = '',
  children,
  ...rest
}) {
  const clickable = Boolean(onClick);
  const cls = ['ay-tag', !onRemove && 'ay-tag--plain', clickable && 'ay-tag--clickable', selected && 'ay-tag--selected', className].filter(Boolean).join(' ');
  const Tag_ = clickable ? 'button' : 'span';
  return /*#__PURE__*/React.createElement(Tag_, _extends({
    className: cls,
    onClick: onClick,
    "aria-pressed": clickable ? selected : undefined
  }, rest), color ? /*#__PURE__*/React.createElement("span", {
    className: "ay-tag__swatch",
    style: {
      background: color
    }
  }) : null, children, onRemove ? /*#__PURE__*/React.createElement("span", {
    className: "ay-tag__remove",
    role: "button",
    tabIndex: 0,
    "aria-label": "Remove",
    onClick: e => {
      e.stopPropagation();
      onRemove(e);
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "xmark",
    weight: 900,
    style: {
      fontSize: 9
    }
  })) : null);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Alert.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const GLYPH = {
  info: 'circle-info',
  success: 'circle-check',
  warning: 'triangle-exclamation',
  danger: 'circle-exclamation',
  neutral: 'circle-info'
};
function Alert({
  tone = 'neutral',
  title,
  icon,
  action,
  onDismiss,
  className = '',
  children,
  ...rest
}) {
  const cls = ['ay-alert', tone !== 'neutral' && 'ay-alert--' + tone, className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", _extends({
    className: cls,
    role: tone === 'danger' ? 'alert' : 'status'
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    className: "ay-alert__icon",
    name: icon || GLYPH[tone],
    weight: 900
  }), /*#__PURE__*/React.createElement("div", {
    className: "ay-alert__body"
  }, title ? /*#__PURE__*/React.createElement("span", {
    className: "ay-alert__title"
  }, title) : null, children ? /*#__PURE__*/React.createElement("span", {
    className: "ay-alert__text"
  }, children) : null, action ? /*#__PURE__*/React.createElement("span", {
    style: {
      marginTop: 7
    }
  }, action) : null), onDismiss ? /*#__PURE__*/React.createElement("span", {
    role: "button",
    tabIndex: 0,
    "aria-label": "Dismiss",
    onClick: onDismiss,
    style: {
      cursor: 'pointer',
      opacity: 0.7,
      marginTop: 1
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "xmark",
    weight: 900,
    style: {
      fontSize: 12
    }
  })) : null);
}
Object.assign(__ds_scope, { Alert });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Alert.jsx", error: String((e && e.message) || e) }); }

// components/feedback/StatusPill.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const PRESET = {
  saving: {
    icon: 'cloud-arrow-up',
    label: 'Saving',
    tone: 'saving',
    pulse: true
  },
  saved: {
    icon: 'cloud-arrow-up',
    label: 'Saved',
    tone: 'quiet'
  },
  offline: {
    icon: 'cloud-xmark',
    label: 'Offline',
    tone: 'offline'
  },
  success: {
    icon: 'circle-check',
    label: 'Done',
    tone: 'success'
  },
  failed: {
    icon: 'circle-exclamation',
    label: 'Failed',
    tone: 'failed'
  },
  starred: {
    icon: 'star',
    label: 'Starred',
    tone: 'starred'
  }
};
function StatusPill({
  status = 'saved',
  label,
  icon,
  dot = false,
  className = '',
  children,
  ...rest
}) {
  const preset = PRESET[status] || PRESET.saved;
  const cls = ['ay-status', 'ay-status--' + preset.tone, preset.pulse && dot && 'ay-status--pulse', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), dot ? /*#__PURE__*/React.createElement("span", {
    className: "ay-status__dot"
  }) : /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon || preset.icon,
    weight: 900,
    style: {
      fontSize: '1em'
    }
  }), children || label || preset.label);
}
Object.assign(__ds_scope, { StatusPill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/StatusPill.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const GLYPH = {
  info: 'circle-info',
  success: 'circle-check',
  warning: 'triangle-exclamation',
  danger: 'circle-exclamation',
  neutral: 'circle-info'
};
function Toast({
  tone = 'neutral',
  title,
  action,
  onDismiss,
  leaving = false,
  className = '',
  children,
  ...rest
}) {
  const cls = ['ay-toast', tone !== 'neutral' && 'ay-toast--' + tone, leaving && 'ay-toast--leaving', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", _extends({
    className: cls,
    role: "status"
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    className: "ay-toast__icon",
    name: GLYPH[tone],
    weight: 900
  }), /*#__PURE__*/React.createElement("div", {
    className: "ay-alert__body"
  }, title ? /*#__PURE__*/React.createElement("span", {
    className: "ay-alert__title"
  }, title) : null, children ? /*#__PURE__*/React.createElement("span", {
    className: "ay-alert__text"
  }, children) : null), action, onDismiss ? /*#__PURE__*/React.createElement("span", {
    role: "button",
    tabIndex: 0,
    "aria-label": "Dismiss",
    onClick: onDismiss,
    style: {
      cursor: 'pointer',
      opacity: 0.7,
      marginTop: 1
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "xmark",
    weight: 900,
    style: {
      fontSize: 12
    }
  })) : null);
}
function ToastViewport({
  className = '',
  children,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['ay-toast__viewport', className].filter(Boolean).join(' ')
  }, rest), children);
}
Object.assign(__ds_scope, { Toast, ToastViewport });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Checkbox({
  checked,
  defaultChecked,
  label,
  description,
  invalid = false,
  disabled = false,
  onChange,
  className = '',
  ...rest
}) {
  const [internal, setInternal] = React.useState(Boolean(defaultChecked));
  const [focused, setFocused] = React.useState(false);
  const isControlled = checked !== undefined;
  const on = isControlled ? checked : internal;
  const cls = ['ay-check', on && 'ay-check--checked', focused && 'ay-check--focused', invalid && 'ay-check--invalid', disabled && 'ay-check--disabled', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("label", {
    className: cls
  }, /*#__PURE__*/React.createElement("span", {
    className: "ay-check__box"
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    className: "ay-check__input",
    checked: on,
    disabled: disabled,
    "aria-invalid": invalid || undefined,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    onChange: e => {
      if (!isControlled) setInternal(e.target.checked);
      if (onChange) onChange(e);
    }
  }, rest)), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    className: "ay-check__mark",
    name: "check",
    weight: 900
  })), label || description ? /*#__PURE__*/React.createElement("span", {
    className: "ay-check__text"
  }, /*#__PURE__*/React.createElement("span", null, label), description ? /*#__PURE__*/React.createElement("span", {
    className: "ay-check__desc"
  }, description) : null) : null);
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/FormField.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function FormField({
  label,
  htmlFor,
  required = false,
  help,
  error,
  disabled = false,
  className = '',
  children,
  ...rest
}) {
  const cls = ['ay-field', disabled && 'ay-field--disabled', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", _extends({
    className: cls
  }, rest), label ? /*#__PURE__*/React.createElement("label", {
    className: "ay-field__label",
    htmlFor: htmlFor
  }, label, required ? /*#__PURE__*/React.createElement("span", {
    className: "ay-field__required",
    "aria-hidden": "true"
  }, "*") : null) : null, children, error ? /*#__PURE__*/React.createElement("span", {
    className: "ay-field__error",
    role: "alert"
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "circle-exclamation",
    weight: 900,
    style: {
      fontSize: 11
    }
  }), error) : help ? /*#__PURE__*/React.createElement("span", {
    className: "ay-field__help"
  }, help) : null);
}
Object.assign(__ds_scope, { FormField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/FormField.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Input({
  size = 'md',
  icon,
  iconEnd,
  invalid = false,
  action,
  className = '',
  style,
  ...rest
}) {
  const cls = ['ay-input', size !== 'md' && 'ay-input--' + size, invalid && 'ay-input--invalid', className].filter(Boolean).join(' ');
  const field = /*#__PURE__*/React.createElement("input", _extends({
    className: cls,
    "aria-invalid": invalid || undefined,
    style: style
  }, rest));
  if (!icon && !iconEnd && !action) return field;
  const wrap = ['ay-inputgroup', icon && 'ay-inputgroup--has-icon', (iconEnd || action) && 'ay-inputgroup--has-icon-end'].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", {
    className: wrap
  }, icon ? /*#__PURE__*/React.createElement("span", {
    className: "ay-inputgroup__icon"
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon
  })) : null, field, iconEnd ? /*#__PURE__*/React.createElement("span", {
    className: "ay-inputgroup__icon ay-inputgroup__icon--end"
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconEnd
  })) : null, action ? /*#__PURE__*/React.createElement("span", {
    className: "ay-inputgroup__action"
  }, action) : null);
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/SearchField.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function SearchField({
  value,
  onChange,
  onClear,
  placeholder = 'Search',
  size = 'md',
  className = '',
  ...rest
}) {
  const showClear = Boolean(value) && Boolean(onClear);
  return /*#__PURE__*/React.createElement("span", {
    className: "ay-inputgroup ay-inputgroup--has-icon ay-inputgroup--has-icon-end"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ay-inputgroup__icon ay-search__icon"
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "magnifying-glass"
  })), /*#__PURE__*/React.createElement("input", _extends({
    type: "search",
    className: ['ay-input', 'ay-search', size !== 'md' && 'ay-input--' + size, className].filter(Boolean).join(' '),
    placeholder: placeholder,
    value: value,
    onChange: onChange
  }, rest)), showClear ? /*#__PURE__*/React.createElement("span", {
    className: "ay-inputgroup__icon ay-inputgroup__icon--end",
    style: {
      pointerEvents: 'auto',
      cursor: 'pointer'
    },
    role: "button",
    "aria-label": "Clear search",
    onClick: onClear
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "circle-xmark",
    weight: 900
  })) : null);
}
Object.assign(__ds_scope, { SearchField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/SearchField.jsx", error: String((e && e.message) || e) }); }

// components/forms/SegmentedControl.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function SegmentedControl({
  options = [],
  value,
  onChange,
  size = 'md',
  className = '',
  ...rest
}) {
  const cls = ['ay-seg', size === 'sm' && 'ay-seg--sm', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", _extends({
    className: cls,
    role: "tablist"
  }, rest), options.map(o => {
    const opt = typeof o === 'string' ? {
      value: o,
      label: o
    } : o;
    const selected = value === opt.value;
    return /*#__PURE__*/React.createElement("button", {
      key: opt.value,
      type: "button",
      role: "tab",
      className: "ay-seg__item",
      "aria-selected": selected,
      onClick: () => onChange && onChange(opt.value)
    }, opt.icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: opt.icon,
      style: {
        fontSize: '0.95em'
      }
    }) : null, opt.label ? /*#__PURE__*/React.createElement("span", null, opt.label) : null);
  }));
}
Object.assign(__ds_scope, { SegmentedControl });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/SegmentedControl.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Select({
  size = 'md',
  invalid = false,
  options = [],
  placeholder,
  className = '',
  children,
  ...rest
}) {
  const cls = ['ay-input', 'ay-select', size !== 'md' && 'ay-input--' + size, invalid && 'ay-input--invalid', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", {
    className: "ay-select__wrap"
  }, /*#__PURE__*/React.createElement("select", _extends({
    className: cls,
    "aria-invalid": invalid || undefined
  }, rest), placeholder ? /*#__PURE__*/React.createElement("option", {
    value: ""
  }, placeholder) : null, options.map(o => {
    const opt = typeof o === 'string' ? {
      value: o,
      label: o
    } : o;
    return /*#__PURE__*/React.createElement("option", {
      key: opt.value,
      value: opt.value,
      disabled: opt.disabled
    }, opt.label);
  }), children), /*#__PURE__*/React.createElement("span", {
    className: "ay-select__chevron"
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    weight: 900,
    style: {
      fontSize: 12
    }
  })));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/layout/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Card({
  variant = 'default',
  pad = false,
  interactive = false,
  selected = false,
  as = 'div',
  className = '',
  children,
  ...rest
}) {
  const Tag = as;
  const cls = ['ay-card', variant !== 'default' && 'ay-card--' + variant, pad && 'ay-card--pad', interactive && 'ay-card--interactive', selected && 'ay-card--selected', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement(Tag, _extends({
    className: cls,
    tabIndex: interactive && Tag !== 'button' ? 0 : undefined
  }, rest), children);
}
function CardHeader({
  title,
  subtitle,
  action,
  className = '',
  children,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['ay-card__header', className].filter(Boolean).join(' ')
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
      flex: 1,
      minWidth: 0
    }
  }, title ? /*#__PURE__*/React.createElement("span", {
    className: "ay-card__title"
  }, title) : null, subtitle ? /*#__PURE__*/React.createElement("span", {
    className: "ay-card__subtitle"
  }, subtitle) : null, children), action);
}
function CardBody({
  className = '',
  children,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['ay-card__body', className].filter(Boolean).join(' ')
  }, rest), children);
}
function CardFooter({
  className = '',
  children,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['ay-card__footer', className].filter(Boolean).join(' ')
  }, rest), children);
}
Object.assign(__ds_scope, { Card, CardHeader, CardBody, CardFooter });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/Card.jsx", error: String((e && e.message) || e) }); }

// components/layout/EmptyState.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function EmptyState({
  icon = 'folder-open',
  title,
  text,
  action,
  className = '',
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['ay-empty', className].filter(Boolean).join(' ')
  }, rest), icon ? /*#__PURE__*/React.createElement("span", {
    className: "ay-empty__icon"
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    weight: 300
  })) : null, title ? /*#__PURE__*/React.createElement("span", {
    className: "ay-empty__title"
  }, title) : null, text ? /*#__PURE__*/React.createElement("span", {
    className: "ay-empty__text"
  }, text) : null, action ? /*#__PURE__*/React.createElement("span", {
    style: {
      marginTop: 5
    }
  }, action) : null);
}
Object.assign(__ds_scope, { EmptyState });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/EmptyState.jsx", error: String((e && e.message) || e) }); }

// components/layout/ListRow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function ListRow({
  icon,
  title,
  meta,
  end,
  interactive = false,
  selected = false,
  divided = false,
  as,
  className = '',
  children,
  ...rest
}) {
  const Tag = as || (interactive ? 'button' : 'div');
  const cls = ['ay-row', interactive && 'ay-row--interactive', selected && 'ay-row--selected', divided && 'ay-row__divider', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement(Tag, _extends({
    className: cls,
    type: Tag === 'button' ? 'button' : undefined,
    "aria-current": selected || undefined
  }, rest), icon, /*#__PURE__*/React.createElement("span", {
    className: "ay-row__main"
  }, title ? /*#__PURE__*/React.createElement("span", {
    className: "ay-row__title"
  }, title) : null, meta ? /*#__PURE__*/React.createElement("span", {
    className: "ay-row__meta"
  }, meta) : null, children), end ? /*#__PURE__*/React.createElement("span", {
    className: "ay-row__end"
  }, end) : null);
}
Object.assign(__ds_scope, { ListRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/ListRow.jsx", error: String((e && e.message) || e) }); }

// components/layout/Panel.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Panel({
  variant = 'default',
  as = 'div',
  className = '',
  children,
  ...rest
}) {
  const Tag = as;
  const cls = ['ay-panel', variant !== 'default' && 'ay-panel--' + variant, className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement(Tag, _extends({
    className: cls
  }, rest), children);
}
Object.assign(__ds_scope, { Panel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/Panel.jsx", error: String((e && e.message) || e) }); }

// components/layout/ProgressBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function ProgressBar({
  value = 0,
  max = 100,
  size = 'md',
  indeterminate = false,
  label,
  tone,
  className = '',
  ...rest
}) {
  const pct = indeterminate ? 100 : Math.max(0, Math.min(100, Number(value) / max * 100));
  const cls = ['ay-progress', size !== 'md' && 'ay-progress--' + size, indeterminate && 'ay-progress--indeterminate', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", _extends({
    className: cls,
    role: "progressbar",
    "aria-valuenow": indeterminate ? undefined : Number(value),
    "aria-valuemin": 0,
    "aria-valuemax": max,
    "aria-label": label
  }, rest), /*#__PURE__*/React.createElement("div", {
    className: "ay-progress__fill",
    style: {
      width: pct + '%',
      background: tone
    }
  }));
}
Object.assign(__ds_scope, { ProgressBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/ProgressBar.jsx", error: String((e && e.message) || e) }); }

// components/layout/Skeleton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Skeleton({
  variant = 'text',
  width,
  height,
  radius,
  lines = 1,
  className = '',
  style,
  ...rest
}) {
  const cls = ['ay-skeleton', variant !== 'block' && 'ay-skeleton--' + variant, className].filter(Boolean).join(' ');
  if (variant === 'text' && lines > 1) {
    return /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        width: width || '100%'
      }
    }, Array.from({
      length: lines
    }).map((_, i) => /*#__PURE__*/React.createElement("span", {
      key: i,
      className: cls,
      style: {
        width: i === lines - 1 ? '62%' : '100%',
        height: height || 12
      }
    })));
  }
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls,
    style: {
      width,
      height,
      borderRadius: radius,
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Skeleton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/Skeleton.jsx", error: String((e && e.message) || e) }); }

// components/layout/Table.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Table({
  columns = [],
  rows = [],
  quiet = false,
  sort,
  onSort,
  className = '',
  ...rest
}) {
  return /*#__PURE__*/React.createElement("table", _extends({
    className: ['ay-table', quiet && 'ay-table--quiet', className].filter(Boolean).join(' ')
  }, rest), /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, columns.map(c => /*#__PURE__*/React.createElement("th", {
    key: c.key,
    className: c.align === 'right' ? 'ay-table__num' : undefined,
    "aria-sort": sort && sort.key === c.key ? sort.direction === 'asc' ? 'ascending' : 'descending' : undefined,
    onClick: c.sortable && onSort ? () => onSort(c.key) : undefined,
    style: c.width ? {
      width: c.width
    } : undefined
  }, c.label, c.sortable && sort && sort.key === c.key ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: sort.direction === 'asc' ? 'arrow-up' : 'arrow-down',
    weight: 900,
    style: {
      fontSize: 9,
      marginLeft: 5
    }
  }) : null)))), /*#__PURE__*/React.createElement("tbody", null, rows.map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: r.id != null ? r.id : i
  }, columns.map(c => /*#__PURE__*/React.createElement("td", {
    key: c.key,
    className: c.align === 'right' ? 'ay-table__num' : undefined
  }, c.render ? c.render(r) : r[c.key]))))));
}
Object.assign(__ds_scope, { Table });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/Table.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Breadcrumb.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Breadcrumb({
  items = [],
  className = '',
  ...rest
}) {
  return /*#__PURE__*/React.createElement("nav", _extends({
    className: ['ay-crumbs', className].filter(Boolean).join(' '),
    "aria-label": "Breadcrumb"
  }, rest), items.map((item, i) => {
    const last = i === items.length - 1;
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: item.label + i
    }, last ? /*#__PURE__*/React.createElement("span", {
      className: "ay-crumbs__current",
      "aria-current": "page"
    }, item.label) : /*#__PURE__*/React.createElement("a", {
      className: "ay-crumbs__link",
      href: item.href || '#',
      onClick: item.onClick
    }, item.label), last ? null : /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      className: "ay-crumbs__sep",
      name: "chevron-right",
      weight: 900,
      style: {
        fontSize: 9
      }
    }));
  }));
}
Object.assign(__ds_scope, { Breadcrumb });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Breadcrumb.jsx", error: String((e && e.message) || e) }); }

// components/navigation/NavItem.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function NavItem({
  icon,
  active = false,
  count,
  block = false,
  light = false,
  as,
  className = '',
  children,
  ...rest
}) {
  const Tag = as || (rest.href ? 'a' : 'button');
  const cls = ['ay-navitem', active && 'ay-navitem--active', block && 'ay-navitem--block', light && 'ay-navitem--light', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement(Tag, _extends({
    className: cls,
    type: Tag === 'button' ? 'button' : undefined,
    "aria-current": active ? 'page' : undefined
  }, rest), icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    className: "ay-navitem__icon",
    name: icon
  }) : null, /*#__PURE__*/React.createElement("span", null, children), count != null ? /*#__PURE__*/React.createElement("span", {
    className: "ay-navitem__count"
  }, count) : null);
}
Object.assign(__ds_scope, { NavItem });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/NavItem.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Pagination.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function pages(current, total) {
  if (total <= 7) return Array.from({
    length: total
  }, (_, i) => i + 1);
  const out = [1];
  const from = Math.max(2, current - 1);
  const to = Math.min(total - 1, current + 1);
  if (from > 2) out.push('gap-start');
  for (let p = from; p <= to; p++) out.push(p);
  if (to < total - 1) out.push('gap-end');
  out.push(total);
  return out;
}
function Pagination({
  page = 1,
  total = 1,
  onChange,
  className = '',
  ...rest
}) {
  const go = p => onChange && onChange(Math.max(1, Math.min(total, p)));
  return /*#__PURE__*/React.createElement("nav", _extends({
    className: ['ay-pager', className].filter(Boolean).join(' '),
    "aria-label": "Pagination"
  }, rest), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "ay-pager__btn",
    disabled: page <= 1,
    onClick: () => go(page - 1),
    "aria-label": "Previous page"
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-left",
    weight: 900,
    style: {
      fontSize: 11
    }
  })), pages(page, total).map(p => typeof p === 'number' ? /*#__PURE__*/React.createElement("button", {
    key: p,
    type: "button",
    className: "ay-pager__btn",
    "aria-current": p === page ? 'page' : undefined,
    onClick: () => go(p)
  }, p) : /*#__PURE__*/React.createElement("span", {
    key: p,
    className: "ay-pager__gap"
  }, "\u2026")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "ay-pager__btn",
    disabled: page >= total,
    onClick: () => go(page + 1),
    "aria-label": "Next page"
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-right",
    weight: 900,
    style: {
      fontSize: 11
    }
  })));
}
Object.assign(__ds_scope, { Pagination });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Pagination.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Sidebar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Sidebar({
  width,
  className = '',
  children,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("nav", _extends({
    className: ['ay-sidebar', className].filter(Boolean).join(' '),
    style: width ? {
      width
    } : undefined
  }, rest), children);
}
function SidebarGroup({
  label,
  className = '',
  children,
  ...rest
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, label ? /*#__PURE__*/React.createElement("div", _extends({
    className: ['ay-sidebar__group', className].filter(Boolean).join(' ')
  }, rest), label) : null, children);
}
Object.assign(__ds_scope, { Sidebar, SidebarGroup });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Sidebar.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Tabs({
  tabs = [],
  value,
  onChange,
  variant = 'underline',
  className = '',
  ...rest
}) {
  const cls = ['ay-tabs', variant === 'pill' && 'ay-tabs--pill', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", _extends({
    className: cls,
    role: "tablist"
  }, rest), tabs.map(t => {
    const tab = typeof t === 'string' ? {
      value: t,
      label: t
    } : t;
    return /*#__PURE__*/React.createElement("button", {
      key: tab.value,
      type: "button",
      role: "tab",
      className: "ay-tabs__tab",
      "aria-selected": value === tab.value,
      disabled: tab.disabled,
      onClick: () => onChange && onChange(tab.value)
    }, tab.icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: tab.icon,
      style: {
        fontSize: '0.9em'
      }
    }) : null, tab.label, tab.count != null ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 'var(--text-xs)',
        color: 'var(--text-tertiary)'
      }
    }, tab.count) : null);
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Toolbar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Toolbar({
  items = [],
  className = '',
  children,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['ay-toolbar', className].filter(Boolean).join(' '),
    role: "toolbar"
  }, rest), items.map((item, i) => item === 'separator' || item.separator ? /*#__PURE__*/React.createElement("span", {
    key: 'sep' + i,
    className: "ay-toolbar__sep"
  }) : /*#__PURE__*/React.createElement("button", {
    key: item.name || i,
    type: "button",
    className: "ay-toolbar__btn",
    "aria-label": item.label,
    title: item.label,
    "aria-pressed": item.active,
    onClick: item.onClick
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: item.icon,
    weight: item.weight || 900
  }))), children);
}
Object.assign(__ds_scope, { Toolbar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Toolbar.jsx", error: String((e && e.message) || e) }); }

// components/navigation/TopBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function TopBar({
  brand,
  start,
  end,
  light = false,
  className = '',
  children,
  ...rest
}) {
  const cls = ['ay-topbar', light && 'ay-topbar--light', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("header", _extends({
    className: cls
  }, rest), brand ? /*#__PURE__*/React.createElement("span", {
    className: "ay-topbar__brand"
  }, brand) : null, start, children, /*#__PURE__*/React.createElement("span", {
    className: "ay-topbar__spacer"
  }), end);
}
Object.assign(__ds_scope, { TopBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/TopBar.jsx", error: String((e && e.message) || e) }); }

// components/overlays/Drawer.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Drawer({
  open = true,
  side = 'right',
  title,
  width,
  onClose,
  className = '',
  children,
  ...rest
}) {
  if (!open) return null;
  const cls = ['ay-drawer', side === 'left' && 'ay-drawer--left', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "ay-scrim",
    onClick: onClose
  }), /*#__PURE__*/React.createElement("aside", _extends({
    className: cls,
    style: width ? {
      width
    } : undefined,
    role: "dialog",
    "aria-label": typeof title === 'string' ? title : undefined
  }, rest), /*#__PURE__*/React.createElement("div", {
    className: "ay-drawer__header"
  }, title ? /*#__PURE__*/React.createElement("span", {
    className: "ay-drawer__title"
  }, title) : /*#__PURE__*/React.createElement("span", {
    className: "ay-drawer__title"
  }), onClose ? /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "xmark",
    label: "Close",
    size: "sm",
    onClick: onClose
  }) : null), /*#__PURE__*/React.createElement("div", {
    className: "ay-drawer__body"
  }, children)));
}
Object.assign(__ds_scope, { Drawer });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlays/Drawer.jsx", error: String((e && e.message) || e) }); }

// components/overlays/Menu.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Menu({
  items = [],
  light = false,
  className = '',
  children,
  ...rest
}) {
  const cls = ['ay-menu', light && 'ay-menu--light', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", _extends({
    className: cls,
    role: "menu"
  }, rest), items.map((item, i) => {
    if (item === 'separator' || item.separator) return /*#__PURE__*/React.createElement("span", {
      key: 'sep' + i,
      className: "ay-menu__sep"
    });
    if (item.group) return /*#__PURE__*/React.createElement("div", {
      key: 'grp' + i,
      className: "ay-menu__group"
    }, item.group);
    return /*#__PURE__*/React.createElement("button", {
      key: item.label + i,
      type: "button",
      role: "menuitem",
      className: ['ay-menu__item', item.tone === 'danger' && 'ay-menu__item--danger'].filter(Boolean).join(' '),
      disabled: item.disabled,
      onClick: item.onClick
    }, item.icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      className: "ay-menu__icon",
      name: item.icon
    }) : null, /*#__PURE__*/React.createElement("span", {
      className: "ay-menu__label"
    }, item.label), item.shortcut ? /*#__PURE__*/React.createElement("span", {
      className: "ay-menu__shortcut"
    }, item.shortcut) : null);
  }), children);
}
Object.assign(__ds_scope, { Menu });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlays/Menu.jsx", error: String((e && e.message) || e) }); }

// components/overlays/Modal.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Modal({
  open = true,
  title,
  subtitle,
  size = 'md',
  footer,
  splitFooter = false,
  onClose,
  closeOnScrim = true,
  className = '',
  children,
  ...rest
}) {
  React.useEffect(() => {
    if (!open || !onClose) return undefined;
    const onKey = e => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  const cls = ['ay-modal', size !== 'md' && 'ay-modal--' + size, className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "ay-scrim",
    onClick: closeOnScrim && onClose ? onClose : undefined
  }), /*#__PURE__*/React.createElement("div", _extends({
    className: cls,
    role: "dialog",
    "aria-modal": "true",
    "aria-label": typeof title === 'string' ? title : undefined
  }, rest), title || subtitle ? /*#__PURE__*/React.createElement("div", {
    className: "ay-modal__header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ay-modal__titles"
  }, title ? /*#__PURE__*/React.createElement("span", {
    className: "ay-modal__title"
  }, title) : null, subtitle ? /*#__PURE__*/React.createElement("span", {
    className: "ay-modal__subtitle"
  }, subtitle) : null)) : null, onClose ? /*#__PURE__*/React.createElement("span", {
    className: "ay-modal__close"
  }, /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "xmark",
    label: "Close",
    size: "sm",
    onClick: onClose
  })) : null, /*#__PURE__*/React.createElement("div", {
    className: "ay-modal__body"
  }, children), footer ? /*#__PURE__*/React.createElement("div", {
    className: ['ay-modal__footer', splitFooter && 'ay-modal__footer--split'].filter(Boolean).join(' ')
  }, footer) : null));
}
Object.assign(__ds_scope, { Modal });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlays/Modal.jsx", error: String((e && e.message) || e) }); }

// components/overlays/Popover.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Popover({
  open = true,
  placement = 'bottom',
  offset = 8,
  className = '',
  style,
  children,
  ...rest
}) {
  if (!open) return null;
  const pos = placement === 'top' ? {
    bottom: 'calc(100% + ' + offset + 'px)',
    left: 0
  } : {
    top: 'calc(100% + ' + offset + 'px)',
    left: 0
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['ay-popover', className].filter(Boolean).join(' '),
    style: {
      ...pos,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Popover });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlays/Popover.jsx", error: String((e && e.message) || e) }); }

// components/overlays/Tooltip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Tooltip({
  label,
  placement = 'top',
  className = '',
  children,
  ...rest
}) {
  const [open, setOpen] = React.useState(false);
  return /*#__PURE__*/React.createElement("span", _extends({
    className: ['ay-tooltip', className].filter(Boolean).join(' '),
    onMouseEnter: () => setOpen(true),
    onMouseLeave: () => setOpen(false),
    onFocus: () => setOpen(true),
    onBlur: () => setOpen(false)
  }, rest), children, /*#__PURE__*/React.createElement("span", {
    role: "tooltip",
    className: ['ay-tooltip__bubble', placement === 'bottom' && 'ay-tooltip__bubble--bottom', open && 'ay-tooltip__bubble--visible'].filter(Boolean).join(' ')
  }, label));
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlays/Tooltip.jsx", error: String((e && e.message) || e) }); }

// ui_kits/airly-app/EditorScreen.jsx
try { (() => {
const AE = window.AirlyDesignSystem_997ac6;
function EditorScreen({
  doc,
  onBack,
  onNotify
}) {
  const {
    Breadcrumb,
    PaperSheet,
    Toolbar,
    StatusPill,
    Button,
    IconButton,
    Tooltip,
    Drawer,
    ListRow,
    Popover,
    Switch,
    Input,
    FormField,
    Badge,
    Avatar,
    AvatarGroup,
    Alert
  } = AE;
  const [bold, setBold] = React.useState(true);
  const [details, setDetails] = React.useState(false);
  const [share, setShare] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const title = doc && doc.title || 'Untitled document';
  const touch = () => {
    setSaving(true);
    window.setTimeout(() => setSaving(false), 1400);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '28px 40px 80px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement(Breadcrumb, {
    items: [{
      label: 'Home',
      onClick: onBack
    }, {
      label: doc && doc.folder || 'Personal',
      onClick: onBack
    }, {
      label: title
    }]
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(StatusPill, {
    status: saving ? 'saving' : 'saved',
    dot: saving
  }), /*#__PURE__*/React.createElement(AvatarGroup, null, /*#__PURE__*/React.createElement(Avatar, {
    name: "Anna Ruiz",
    size: "sm"
  }), /*#__PURE__*/React.createElement(Avatar, {
    name: "Kim Lee",
    size: "sm",
    color: "var(--intent-info)"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    size: "sm",
    icon: "share-nodes",
    onClick: () => setShare(!share)
  }, "Share"), /*#__PURE__*/React.createElement(Popover, {
    open: share,
    style: {
      right: 0,
      left: 'auto',
      minWidth: 268
    }
  }, /*#__PURE__*/React.createElement(FormField, {
    label: "Share link"
  }, /*#__PURE__*/React.createElement(Input, {
    size: "sm",
    readOnly: true,
    defaultValue: "airly.co/d/8f21",
    action: /*#__PURE__*/React.createElement(IconButton, {
      icon: "copy",
      label: "Copy link",
      size: "xs",
      onClick: () => onNotify('Link copied')
    })
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement(Switch, {
    size: "sm",
    label: "Anyone with the link can view",
    defaultChecked: true
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement(Switch, {
    size: "sm",
    label: "Allow comments"
  })))), /*#__PURE__*/React.createElement(Tooltip, {
    label: "Document details"
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "circle-info",
    label: "Document details",
    onClick: () => setDetails(true)
  }))), doc && doc.tag === 'Draft' ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement(Alert, {
    tone: "warning",
    title: "Draft"
  }, "Only you can see this document until you share it.")) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center',
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement(Toolbar, {
    items: [{
      icon: 'heading',
      label: 'Heading'
    }, {
      icon: 'bold',
      label: 'Bold',
      active: bold,
      onClick: () => {
        setBold(!bold);
        touch();
      }
    }, {
      icon: 'italic',
      label: 'Italic',
      onClick: touch
    }, {
      icon: 'underline',
      label: 'Underline',
      onClick: touch
    }, 'separator', {
      icon: 'list',
      label: 'Bulleted list',
      onClick: touch
    }, {
      icon: 'quote-left',
      label: 'Quote',
      onClick: touch
    }, {
      icon: 'code',
      label: 'Code',
      onClick: touch
    }, 'separator', {
      icon: 'link',
      label: 'Insert link',
      onClick: touch
    }, {
      icon: 'image',
      label: 'Insert image',
      onClick: touch
    }]
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 760,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement(PaperSheet, {
    margin: true,
    pad: 40,
    lineHeight: 30
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 32,
      letterSpacing: '-0.05em',
      lineHeight: 1.1,
      marginBottom: 18,
      fontWeight: bold ? 500 : 300
    }
  }, title), /*#__PURE__*/React.createElement("div", null, "Three open questions before Thursday."), /*#__PURE__*/React.createElement("div", null, "Hiring plan \u2014 two offers out, one pending."), /*#__PURE__*/React.createElement("div", null, "Pricing test \u2014 results land Wednesday."), /*#__PURE__*/React.createElement("div", null, "Launch date \u2014 waiting on the security review."), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 30
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--blue-700)'
    }
  }, "Owner: Anna Ruiz \xB7 Folder: ", doc && doc.folder || 'Personal'))), /*#__PURE__*/React.createElement(Drawer, {
    open: details,
    title: "Document details",
    onClose: () => setDetails(false)
  }, /*#__PURE__*/React.createElement(ListRow, {
    divided: true,
    title: "Owner",
    end: /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 7
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      name: "Anna Ruiz",
      size: "xs"
    }), "Anna Ruiz")
  }), /*#__PURE__*/React.createElement(ListRow, {
    divided: true,
    title: "Folder",
    end: doc && doc.folder || 'Personal'
  }), /*#__PURE__*/React.createElement(ListRow, {
    divided: true,
    title: "Created",
    end: "12 Aug 2026"
  }), /*#__PURE__*/React.createElement(ListRow, {
    divided: true,
    title: "Size",
    end: "12 KB"
  }), /*#__PURE__*/React.createElement(ListRow, {
    divided: true,
    title: "Visibility",
    end: /*#__PURE__*/React.createElement(Badge, {
      tone: "soft-info"
    }, "Shared")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18,
      display: 'flex',
      gap: 9
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    size: "sm",
    icon: "download"
  }, "Export"), /*#__PURE__*/React.createElement(Button, {
    variant: "danger",
    size: "sm",
    icon: "trash",
    onClick: () => {
      setDetails(false);
      onNotify('Moved to trash', 'danger');
    }
  }, "Delete"))));
}
Object.assign(window, {
  EditorScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/airly-app/EditorScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/airly-app/HomeScreen.jsx
try { (() => {
const AD = window.AirlyDesignSystem_997ac6;
function HomeScreen({
  folder,
  starredOnly,
  onOpenDoc,
  onOpenFolder,
  onNotify
}) {
  const {
    Breadcrumb,
    Badge,
    SegmentedControl,
    Tabs,
    FolderTile,
    Card,
    CardHeader,
    CardBody,
    ListRow,
    Icon,
    IconButton,
    Menu,
    Popover,
    EmptyState,
    Button,
    StatusPill,
    Divider
  } = AD;
  const [view, setView] = React.useState('grid');
  const [tab, setTab] = React.useState('all');
  const [menuFor, setMenuFor] = React.useState(null);
  const docs = [{
    title: 'Q3 planning',
    meta: 'Edited 2 hours ago',
    folder: 'Personal',
    starred: true,
    tone: 'soft-info',
    tag: 'Shared'
  }, {
    title: 'Term sheet',
    meta: 'Edited yesterday',
    folder: 'Work',
    starred: true
  }, {
    title: 'Board update',
    meta: 'Edited 3 days ago',
    folder: 'Work',
    starred: false,
    tone: 'soft-warning',
    tag: 'Draft'
  }, {
    title: 'Hiring plan',
    meta: 'Edited last week',
    folder: 'Personal',
    starred: true
  }].filter(d => folder ? d.folder === folder : true).filter(d => starredOnly || tab === 'starred' ? d.starred : true);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '28px 40px 64px'
    }
  }, /*#__PURE__*/React.createElement(Breadcrumb, {
    items: folder ? [{
      label: 'Home',
      onClick: () => onOpenFolder(null)
    }, {
      label: folder
    }] : [{
      label: starredOnly ? 'Starred' : 'Home'
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      margin: '18px 0 24px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "airly-display-rg",
    style: {
      color: 'var(--text-primary)'
    }
  }, starredOnly ? 'Starred' : folder || 'Recently worked on'), /*#__PURE__*/React.createElement(Badge, {
    tone: "soft-info"
  }, docs.length, " items"), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(StatusPill, {
    status: "saved"
  }), /*#__PURE__*/React.createElement(SegmentedControl, {
    value: view,
    onChange: setView,
    options: [{
      value: 'grid',
      icon: 'grid'
    }, {
      value: 'list',
      icon: 'list'
    }]
  })), folder || starredOnly ? null : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 26,
      flexWrap: 'wrap',
      marginBottom: 40
    }
  }, /*#__PURE__*/React.createElement(FolderTile, {
    name: "Personal",
    count: 12,
    color: "var(--accent-cyan)",
    onClick: () => onOpenFolder('Personal')
  }), /*#__PURE__*/React.createElement(FolderTile, {
    name: "Work",
    count: 7,
    color: "var(--accent-yellow)",
    starred: true,
    onClick: () => onOpenFolder('Work')
  }), /*#__PURE__*/React.createElement(FolderTile, {
    name: "Archive",
    count: 31,
    color: "var(--accent-cream)",
    onClick: () => onOpenFolder('Archive')
  })), /*#__PURE__*/React.createElement(Divider, null)), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: '24px 0 18px'
    }
  }, /*#__PURE__*/React.createElement(Tabs, {
    value: tab,
    onChange: setTab,
    tabs: [{
      value: 'all',
      label: 'All',
      count: 4
    }, {
      value: 'starred',
      label: 'Starred',
      count: 3
    }, {
      value: 'trash',
      label: 'Trash',
      disabled: true
    }]
  })), docs.length === 0 ? /*#__PURE__*/React.createElement(EmptyState, {
    icon: "folder-open",
    title: "Nothing here yet",
    text: "Documents you create in this folder will show up here.",
    action: /*#__PURE__*/React.createElement(Button, {
      variant: "accent",
      size: "sm",
      icon: "plus",
      onClick: () => onOpenDoc({
        title: 'Untitled document',
        folder: folder || 'Personal'
      })
    }, "New document")
  }) : view === 'grid' ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill,minmax(268px,1fr))',
      gap: 18
    }
  }, docs.map(d => /*#__PURE__*/React.createElement("div", {
    key: d.title,
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    interactive: true,
    onClick: () => onOpenDoc(d)
  }, /*#__PURE__*/React.createElement(CardHeader, {
    title: d.title,
    subtitle: d.meta,
    action: /*#__PURE__*/React.createElement(IconButton, {
      icon: "ellipsis",
      label: "More actions",
      size: "sm",
      onClick: e => {
        e.stopPropagation();
        setMenuFor(menuFor === d.title ? null : d.title);
      }
    })
  }), /*#__PURE__*/React.createElement(CardBody, null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "folder",
    style: {
      fontSize: 12,
      color: 'var(--icon-quiet)'
    }
  }), d.folder, d.tag ? /*#__PURE__*/React.createElement(Badge, {
    tone: d.tone
  }, d.tag) : null, d.starred ? /*#__PURE__*/React.createElement(Icon, {
    name: "star",
    weight: 900,
    style: {
      fontSize: 11,
      color: 'var(--status-starred)',
      marginLeft: 'auto'
    }
  }) : null))), menuFor === d.title ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 46,
      right: 8,
      zIndex: 5
    }
  }, /*#__PURE__*/React.createElement(Menu, {
    items: [{
      icon: 'pen',
      label: 'Rename',
      shortcut: '⌘R',
      onClick: () => {
        setMenuFor(null);
        onNotify('Renaming is a mock in this kit', 'info');
      }
    }, {
      icon: 'folder-open',
      label: 'Move to…',
      onClick: () => {
        setMenuFor(null);
        onNotify('Moved to Archive');
      }
    }, {
      icon: 'star',
      label: d.starred ? 'Remove star' : 'Add star',
      onClick: () => {
        setMenuFor(null);
        onNotify(d.starred ? 'Star removed' : 'Starred');
      }
    }, 'separator', {
      icon: 'trash',
      label: 'Delete',
      tone: 'danger',
      onClick: () => {
        setMenuFor(null);
        onNotify('Moved to trash', 'danger');
      }
    }]
  })) : null))) : /*#__PURE__*/React.createElement("div", null, docs.map(d => /*#__PURE__*/React.createElement(ListRow, {
    key: d.title,
    interactive: true,
    divided: true,
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "file-lines",
      style: {
        color: 'var(--icon-quiet)'
      }
    }),
    title: d.title,
    meta: d.folder + ' · ' + d.meta,
    end: /*#__PURE__*/React.createElement(React.Fragment, null, d.tag ? /*#__PURE__*/React.createElement(Badge, {
      tone: d.tone
    }, d.tag) : null, d.starred ? /*#__PURE__*/React.createElement(Icon, {
      name: "star",
      weight: 900,
      style: {
        fontSize: 11,
        color: 'var(--status-starred)'
      }
    }) : null),
    onClick: () => onOpenDoc(d)
  }))));
}
Object.assign(window, {
  HomeScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/airly-app/HomeScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/airly-app/SettingsScreen.jsx
try { (() => {
const AS = window.AirlyDesignSystem_997ac6;
function SettingsScreen({
  onNotify
}) {
  const {
    Tabs,
    Card,
    CardHeader,
    CardBody,
    CardFooter,
    FormField,
    Input,
    Select,
    Textarea,
    Checkbox,
    Switch,
    RadioGroup,
    Slider,
    SegmentedControl,
    Button,
    Divider,
    Table,
    Badge,
    Avatar,
    Modal,
    Alert,
    Pagination,
    Panel,
    Tag
  } = AS;
  const [tab, setTab] = React.useState('profile');
  const [access, setAccess] = React.useState('team');
  const [density, setDensity] = React.useState('comfortable');
  const [zoom, setZoom] = React.useState(120);
  const [page, setPage] = React.useState(1);
  const [confirm, setConfirm] = React.useState(false);
  const [name, setName] = React.useState('Anna Ruiz');
  const [email, setEmail] = React.useState('anna@');
  const invalidEmail = !email.includes('.');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '28px 40px 80px',
      maxWidth: 980
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      marginBottom: 22
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "airly-display-rg",
    style: {
      color: 'var(--text-primary)'
    }
  }, "Settings")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement(Tabs, {
    value: tab,
    onChange: setTab,
    tabs: [{
      value: 'profile',
      label: 'Profile'
    }, {
      value: 'workspace',
      label: 'Workspace'
    }, {
      value: 'members',
      label: 'Members',
      count: 3
    }]
  })), tab === 'profile' ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.2fr 1fr',
      gap: 20,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHeader, {
    title: "Your profile",
    subtitle: "Shown on documents you own and share."
  }), /*#__PURE__*/React.createElement(CardBody, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(FormField, {
    label: "Full name",
    htmlFor: "s-name",
    required: true
  }, /*#__PURE__*/React.createElement(Input, {
    id: "s-name",
    value: name,
    onChange: e => setName(e.target.value)
  })), /*#__PURE__*/React.createElement(FormField, {
    label: "Email",
    htmlFor: "s-email",
    required: true,
    error: invalidEmail ? 'Enter a full email address.' : null
  }, /*#__PURE__*/React.createElement(Input, {
    id: "s-email",
    icon: "envelope",
    invalid: invalidEmail,
    value: email,
    onChange: e => setEmail(e.target.value)
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement(FormField, {
    label: "About",
    htmlFor: "s-about",
    help: "Two lines at most."
  }, /*#__PURE__*/React.createElement(Textarea, {
    id: "s-about",
    rows: 3,
    defaultValue: "Operations at Airly. Mostly planning docs."
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement(FormField, {
    label: "Time zone",
    htmlFor: "s-tz"
  }, /*#__PURE__*/React.createElement(Select, {
    id: "s-tz",
    options: ['UTC−08:00 Pacific', 'UTC+00:00 London', 'UTC+05:30 Kolkata']
  })))), /*#__PURE__*/React.createElement(CardFooter, null, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost"
  }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    disabled: invalidEmail,
    onClick: () => onNotify('Profile saved')
  }, "Save changes"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(Card, {
    pad: true
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: name,
    size: "xl"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 20,
      letterSpacing: '-0.03em'
    }
  }, name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-tertiary)'
    }
  }, "Owner \xB7 joined Aug 2026"))), /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    size: "sm",
    block: true,
    icon: "camera"
  }, "Replace photo")), /*#__PURE__*/React.createElement(Card, {
    pad: true
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      marginBottom: 12
    }
  }, "Reading preferences"), /*#__PURE__*/React.createElement(FormField, {
    label: "Editor zoom"
  }, /*#__PURE__*/React.createElement(Slider, {
    value: zoom,
    min: 80,
    max: 200,
    onChange: e => setZoom(+e.target.value),
    showValue: true,
    format: v => v + '%'
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement(FormField, {
    label: "Row density"
  }, /*#__PURE__*/React.createElement(SegmentedControl, {
    size: "sm",
    value: density,
    onChange: setDensity,
    options: [{
      value: 'compact',
      label: 'Compact'
    }, {
      value: 'comfortable',
      label: 'Comfortable'
    }]
  })))))) : null, tab === 'workspace' ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 20,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHeader, {
    title: "Sharing defaults",
    subtitle: "Applied to every new document."
  }), /*#__PURE__*/React.createElement(CardBody, null, /*#__PURE__*/React.createElement(RadioGroup, {
    name: "access",
    label: "Who can open new documents",
    value: access,
    onChange: setAccess,
    options: [{
      value: 'private',
      label: 'Only me'
    }, {
      value: 'team',
      label: 'Everyone at Airly',
      description: 'Members can find and open them in search'
    }, {
      value: 'link',
      label: 'Anyone with the link',
      description: 'No sign-in required'
    }]
  }), /*#__PURE__*/React.createElement(Divider, {
    label: "Then"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Checkbox, {
    label: "Allow comments by default",
    defaultChecked: true
  }), /*#__PURE__*/React.createElement(Checkbox, {
    label: "Notify me when someone opens a shared document",
    description: "One digest per day"
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(Card, {
    pad: true
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Switch, {
    label: "Autosave",
    defaultChecked: true
  }), /*#__PURE__*/React.createElement(Switch, {
    label: "Offline editing",
    defaultChecked: true
  }), /*#__PURE__*/React.createElement(Switch, {
    label: "Weekly summary email"
  }))), /*#__PURE__*/React.createElement(Panel, {
    variant: "inset"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      marginBottom: 8
    }
  }, "Folder colours"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap'
    }
  }, [['Personal', 'var(--accent-cyan)'], ['Work', 'var(--accent-yellow)'], ['Archive', 'var(--accent-cream)'], ['Legal', 'var(--accent-red)']].map(([n, c]) => /*#__PURE__*/React.createElement(Tag, {
    key: n,
    color: c
  }, n)))), /*#__PURE__*/React.createElement(Alert, {
    tone: "danger",
    title: "Delete workspace",
    action: /*#__PURE__*/React.createElement(Button, {
      variant: "danger",
      size: "sm",
      onClick: () => setConfirm(true)
    }, "Delete workspace")
  }, "All documents and folders are removed for every member."))) : null, tab === 'members' ? /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHeader, {
    title: "Members",
    subtitle: "Three people have access to this workspace.",
    action: /*#__PURE__*/React.createElement(Button, {
      variant: "accent",
      size: "sm",
      icon: "user-plus",
      onClick: () => onNotify('Invitation sent')
    }, "Invite")
  }), /*#__PURE__*/React.createElement(CardBody, null, /*#__PURE__*/React.createElement(Table, {
    columns: [{
      key: 'name',
      label: 'Person',
      sortable: true,
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 9
        }
      }, /*#__PURE__*/React.createElement(Avatar, {
        name: r.name,
        size: "sm"
      }), r.name)
    }, {
      key: 'role',
      label: 'Role'
    }, {
      key: 'status',
      label: 'Status',
      render: r => /*#__PURE__*/React.createElement(Badge, {
        tone: r.status === 'Active' ? 'soft-success' : 'soft-warning'
      }, r.status)
    }, {
      key: 'docs',
      label: 'Documents',
      align: 'right'
    }],
    rows: [{
      id: 1,
      name: 'Anna Ruiz',
      role: 'Owner',
      status: 'Active',
      docs: 24
    }, {
      id: 2,
      name: 'Kim Lee',
      role: 'Editor',
      status: 'Active',
      docs: 11
    }, {
      id: 3,
      name: 'Jo Park',
      role: 'Viewer',
      status: 'Invited',
      docs: 0
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement(Pagination, {
    page: page,
    total: 3,
    onChange: setPage
  })))) : null, /*#__PURE__*/React.createElement(Modal, {
    open: confirm,
    size: "sm",
    title: "Delete workspace",
    subtitle: "This cannot be undone.",
    onClose: () => setConfirm(false),
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      onClick: () => setConfirm(false)
    }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
      variant: "danger",
      onClick: () => {
        setConfirm(false);
        onNotify('Workspace deletion scheduled', 'danger');
      }
    }, "Delete"))
  }, "Every document, folder and invitation in this workspace will be removed for all three members."));
}
Object.assign(window, {
  SettingsScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/airly-app/SettingsScreen.jsx", error: String((e && e.message) || e) }); }

__ds_ns.FolderTile = __ds_scope.FolderTile;

__ds_ns.PaperSheet = __ds_scope.PaperSheet;

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.AvatarGroup = __ds_scope.AvatarGroup;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Divider = __ds_scope.Divider;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Link = __ds_scope.Link;

__ds_ns.Spinner = __ds_scope.Spinner;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Alert = __ds_scope.Alert;

__ds_ns.StatusPill = __ds_scope.StatusPill;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.ToastViewport = __ds_scope.ToastViewport;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.FormField = __ds_scope.FormField;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.RadioGroup = __ds_scope.RadioGroup;

__ds_ns.SearchField = __ds_scope.SearchField;

__ds_ns.SegmentedControl = __ds_scope.SegmentedControl;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Slider = __ds_scope.Slider;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Textarea = __ds_scope.Textarea;

__ds_ns.AIRLY_ICONS = __ds_scope.AIRLY_ICONS;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.CardHeader = __ds_scope.CardHeader;

__ds_ns.CardBody = __ds_scope.CardBody;

__ds_ns.CardFooter = __ds_scope.CardFooter;

__ds_ns.EmptyState = __ds_scope.EmptyState;

__ds_ns.ListRow = __ds_scope.ListRow;

__ds_ns.Panel = __ds_scope.Panel;

__ds_ns.ProgressBar = __ds_scope.ProgressBar;

__ds_ns.Skeleton = __ds_scope.Skeleton;

__ds_ns.Table = __ds_scope.Table;

__ds_ns.Breadcrumb = __ds_scope.Breadcrumb;

__ds_ns.NavItem = __ds_scope.NavItem;

__ds_ns.Pagination = __ds_scope.Pagination;

__ds_ns.Sidebar = __ds_scope.Sidebar;

__ds_ns.SidebarGroup = __ds_scope.SidebarGroup;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.Toolbar = __ds_scope.Toolbar;

__ds_ns.TopBar = __ds_scope.TopBar;

__ds_ns.Drawer = __ds_scope.Drawer;

__ds_ns.Menu = __ds_scope.Menu;

__ds_ns.Modal = __ds_scope.Modal;

__ds_ns.Popover = __ds_scope.Popover;

__ds_ns.Tooltip = __ds_scope.Tooltip;

})();
