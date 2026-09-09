import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, useNavigation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout, setCredentials, selectCurrentUser, selectRole, selectToken, selectFeatures } from '../features/auth/authSlice';
import { useMeQuery } from '../features/auth/authApi';
import { useLocale } from '../contexts/LocaleContext';
import { useTheme } from '../contexts/ThemeContext';
import NotificationDrawer, { useNotifBadge } from '../components/NotificationDrawer';
import { api } from '../app/baseApi';
import { useGetReportLowStockQuery } from '../features/reports/reportsApi';
import { getApiUrl } from '../config/runtimeConfig';

const settingsApi = api.injectEndpoints({
  endpoints: b => ({
    getLayoutSettings: b.query({ query: () => '/settings', providesTags: ['Settings'] }),
  }),
  overrideExisting: false,
});

const API = getApiUrl();

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icons = {
  dashboard: <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" strokeWidth={2}/><rect x="14" y="3" width="7" height="7" rx="1" strokeWidth={2}/><rect x="3" y="14" width="7" height="7" rx="1" strokeWidth={2}/><rect x="14" y="14" width="7" height="7" rx="1" strokeWidth={2}/></svg>,
  pos:       <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3m-1-4H9m0 0a2 2 0 0 0 0 4h6a2 2 0 0 0 0-4M9 3h6"/></svg>,
  sales:     <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9l2 2 4-4"/></svg>,
  products:  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>,
  purchases: <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 1 1 0-4h14a2 2 0 1 1 0 4M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8m-9 4h4"/></svg>,
  customers: <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4" strokeWidth={2}/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  suppliers:  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5m-4 0h4"/></svg>,
  categories: <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 0 1 0 2.828l-5 5a2 2 0 0 1-2.828 0l-7-7A2 2 0 0 1 3 10V5a2 2 0 0 1 2-2z"/></svg>,
  users:     <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 1 1 0 5.292M15 21H3v-1a6 6 0 0 1 12 0v1zm0 0h6v-1a6 6 0 0 0-9-5.197"/></svg>,
  settings:  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3" strokeWidth={2}/></svg>,
  upload:    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16v2a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2M12 3v12m0 0l-3-3m3 3l3-3"/></svg>,
  intake:    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="2" height="16" rx="1" strokeWidth={2}/><rect x="7" y="4" width="1" height="16" rx="0.5" strokeWidth={2}/><rect x="10" y="4" width="3" height="16" rx="1" strokeWidth={2}/><rect x="15" y="4" width="1" height="16" rx="0.5" strokeWidth={2}/><rect x="18" y="4" width="3" height="16" rx="1" strokeWidth={2}/></svg>,
  credit:    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2" strokeWidth={2}/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 10h20M6 15h4"/></svg>,
  reports:   <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 0-2 2h-2a2 2 0 0 1-2-2z"/></svg>,
  logout:    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1"/></svg>,
  bell:      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V5a2 2 0 1 0-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9"/></svg>,
  chevronsRight: <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M6 5l7 7-7 7"/></svg>,
  chevronsLeft:  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m7 14l-7-7 7-7"/></svg>,
  truck: <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm10 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
  map:   <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0 0 21 18.382V7.618a1 1 0 0 0-1.447-.894L15 9m0 8V9m0 0L9 7"/></svg>,
  loadsheet: <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 7h6m-6 4h4"/></svg>,
};

const PAGE_TITLE_KEYS = {
  '/dashboard':        'page.dashboard',
  '/sales':            'page.sales',
  '/sales/create':     'Create Order',
  '/invoices':         'Day End',
  '/invoices/create':  'New Day End Entry',
  '/products':         'page.products',
  '/products/create':  'page.new_product',
  '/products/intake':  'Stock Intake',
  '/purchases':        'page.purchases',
  '/purchases/create': 'page.new_purchase',
  '/customers':        'page.customers',
  '/credit':           'nav.credit_book',
  '/suppliers':        'page.suppliers',
  '/categories':       'page.categories',
  '/users':            'page.users',
  '/settings':         'page.settings',
  '/admin/data-import': 'Data Import',
  '/reports':          'page.reports',
  '/reports/aging':    'Aging Report',
  '/deliveries':            'Deliveries',
  '/deliveries/create':     'New Delivery',
  '/deliveries/loadsheet':  'Load Sheet',
  '/areas':            'Areas',
};

const roleColor = { admin: 'bg-red-500', manager: 'bg-orange-500', cashier: 'bg-green-500', sales: 'bg-blue-500' };

export default function AppLayout() {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const location  = useLocation();
  const user      = useSelector(selectCurrentUser);
  const role      = useSelector(selectRole);
  const features  = useSelector(selectFeatures); // null = admin (all access)
  const isManager = role === 'admin' || role === 'manager';
  const canSee    = key => features === null || features.includes(key);
  const { t }     = useLocale();
  const token     = useSelector(selectToken);

  // Refresh user features from server on every app load
  const { data: meData } = useMeQuery(undefined, { skip: !token });
  useEffect(() => {
    if (meData) dispatch(setCredentials({ token, ...meData }));
  }, [meData]);

  const { theme, setTheme } = useTheme();
  const navigation = useNavigation();

  const { data: layoutSettings } = settingsApi.useGetLayoutSettingsQuery(undefined, { skip: !token });
  const { data: lowStockData } = useGetReportLowStockQuery(undefined, { skip: !token, pollingInterval: 120000 });
  const lowStockCount = lowStockData?.products?.length || 0;

  const [notifOpen, setNotifOpen] = useState(false);
  const notifCount = useNotifBadge(token);

  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sidebar_collapsed') === 'true'
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [routing, setRouting] = useState(false);
  const [shopInfo, setShopInfo] = useState({ shop_name: '', shop_logo: '' });

  useEffect(() => {
    setRouting(true);
    const t = setTimeout(() => setRouting(false), 350);
    return () => clearTimeout(t);
  }, [location.pathname]);

  useEffect(() => {
    fetch(`${API}/api/settings/public`)
      .then(r => r.json())
      .then(d => setShopInfo(d))
      .catch(() => {});
  }, []);

  // Update favicon when shop logo changes
  useEffect(() => {
    if (!shopInfo.shop_logo) return;
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = shopInfo.shop_logo;
  }, [shopInfo.shop_logo]);

  // Update page title: "Page Name — Shop Name"
  useEffect(() => {
    const key = PAGE_TITLE_KEYS[location.pathname];
    const page = key ? t(key) : '';
    const shop = shopInfo.shop_name || 'POS';
    document.title = page ? `${page} — ${shop}` : shop;
  }, [location.pathname, shopInfo.shop_name, t]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Apply global zoom — same logic as old app.js (disabled on mobile)
  const [zoomScale, setZoomScale] = useState(1);
  useEffect(() => {
    if (!layoutSettings) return;
    if (window.innerWidth < 768) { setZoomScale(1); return; }
    const autoScale = layoutSettings.pos_auto_scale !== '0' && layoutSettings.pos_auto_scale !== false;
    let scale = 1;
    if (autoScale) {
      scale = window.screen.width < 1500 ? 0.8 : 1;
    } else {
      scale = parseInt(layoutSettings.pos_scale_value || '100', 10) / 100;
    }
    setZoomScale(scale);
  }, [layoutSettings]);

  // On mobile drawer, always show full labels regardless of collapsed state
  const displayCollapsed = collapsed && !mobileOpen;

  const pageTitleKey = Object.entries(PAGE_TITLE_KEYS).find(([path]) =>
    location.pathname === path || location.pathname.startsWith(path + '/')
  )?.[1];
  const pageTitle = pageTitleKey ? t(pageTitleKey) : 'LMUC POS';

  const mainNav = [
    { to: '/dashboard',       label: t('nav.dashboard'),   icon: Icons.dashboard, feature: 'dashboard' },
    { to: '/sales',           label: 'Orders',             icon: Icons.sales,     feature: 'sales' },
    { to: '/deliveries',           label: 'Deliveries',  icon: Icons.truck,      feature: 'deliveries' },
    { to: '/deliveries/loadsheet', label: 'Load Sheet',  icon: Icons.loadsheet,  feature: 'deliveries' },
    { to: '/areas',                label: 'Areas',       icon: Icons.map,        feature: 'areas' },
    { to: '/products',        label: t('nav.products'),    icon: Icons.products,  feature: 'products', end: true, badge: lowStockCount },
    { to: '/products/intake', label: t('nav.stock_intake'),icon: Icons.intake,    feature: 'stock_intake' },
    { to: '/purchases',       label: t('nav.purchases'),   icon: Icons.purchases, feature: 'purchases' },
    { to: '/customers',       label: t('nav.customers'),   icon: Icons.customers, feature: 'customers' },
    { to: '/invoices',        label: 'Day End',            icon: Icons.sales,     feature: 'invoices' },
    { to: '/credit',          label: t('nav.credit_book'), icon: Icons.credit,    feature: 'credit' },
    { to: '/suppliers',       label: t('nav.suppliers'),   icon: Icons.suppliers, feature: 'suppliers' },
    { to: '/categories',      label: t('nav.categories'),  icon: Icons.categories,feature: 'categories' },
  ].filter(n => canSee(n.feature));

  const mgmtNav = [
    { to: '/reports',          label: t('nav.reports'),    icon: Icons.reports,  feature: 'reports' },
    { to: '/users',            label: t('nav.users'),      icon: Icons.users,    feature: 'users' },
    { to: '/settings',         label: t('nav.settings'),   icon: Icons.settings, feature: 'settings' },
    { to: '/admin/data-import',label: 'Data Import',       icon: Icons.upload,   feature: 'data_import',      adminOnly: true },
    { to: '/settings/roles',   label: 'Role Permissions',  icon: Icons.users,    feature: 'role_permissions', adminOnly: true },
  ].filter(n => canSee(n.feature) && (!n.adminOnly || role === 'admin'));

  function toggleCollapse() {
    setCollapsed(c => {
      const next = !c;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  }

  function expandSidebar() {
    setCollapsed(false);
    localStorage.setItem('sidebar_collapsed', 'false');
  }

  function handleLogout() {
    dispatch(logout());
    navigate('/login');
  }

  // Nav item class builder
  function navCls(isActive) {
    const base = `flex items-center py-2.5 rounded-xl text-sm font-medium transition-all duration-150 whitespace-nowrap overflow-hidden
      ${displayCollapsed ? 'justify-center px-0 w-10 mx-auto' : 'gap-3 px-3'}`;
    if (isActive) {
      return `${base} bg-orange-500 text-white shadow-md shadow-orange-500/30`;
    }
    return `${base} text-slate-400 hover:text-white hover:bg-slate-700/60`;
  }

  const zoomStyle = zoomScale !== 1 ? {
    zoom: zoomScale,
    width:  `${100 / zoomScale}vw`,
    height: `${100 / zoomScale}vh`,
  } : {};

  return (
    <>
    <div style={zoomStyle} className="flex h-screen bg-slate-100 overflow-hidden">

      {/* ── Mobile overlay backdrop ─────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[998] bg-black/50 md:hidden print:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside className={`print:hidden bg-slate-900 flex flex-col shrink-0 select-none transition-all duration-300 overflow-hidden
        fixed inset-y-0 left-0 z-[999] w-64
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        md:static md:translate-x-0 md:z-auto md:inset-y-auto md:left-auto
        ${collapsed ? 'md:w-[62px]' : 'md:w-56'}`}>

        {/* Brand / Logo */}
        <div className={`border-b border-slate-700/60 shrink-0 flex items-center transition-all duration-300
          ${displayCollapsed ? 'justify-center py-3 px-0' : 'px-4 py-3 gap-2.5'}`}>
          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-extrabold text-sm shrink-0 overflow-hidden border-2 border-slate-600">
            {shopInfo.shop_logo
              ? <img src={shopInfo.shop_logo} alt="logo" className="w-full h-full object-cover" />
              : <span>{(shopInfo.shop_name || 'L')[0].toUpperCase()}</span>
            }
          </div>
          {!displayCollapsed && (
            <div className="min-w-0">
              <p className="text-white font-bold text-sm leading-tight truncate">
                {shopInfo.shop_name || 'LMUC POS'}
              </p>
              <p className="text-slate-400 text-xs">Distribution</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className={`flex-1 overflow-y-auto py-3 space-y-0.5 ${displayCollapsed ? 'px-1' : 'px-2'}`}>
          {mainNav.map(({ to, label, icon, end: endProp, badge }) => (
            <NavLink key={to} to={to}
              end={endProp || to === '/sales' || to === '/dashboard' || to === '/settings' || to === '/invoices' || to === '/deliveries' || to === '/deliveries/loadsheet' || to === '/areas'}
              title={displayCollapsed ? label : undefined}
              onClick={() => { setMobileOpen(false); expandSidebar(); }}
              className={({ isActive }) => navCls(isActive)}
            >
              {icon}
              {!displayCollapsed && <span className="flex-1 truncate">{label}</span>}
              {!displayCollapsed && badge > 0 && (
                <span className="shrink-0 text-[10px] font-bold bg-red-500 text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </NavLink>
          ))}

          {mgmtNav.length > 0 && (
            <>
              <div className={`pt-4 pb-1.5 ${displayCollapsed ? 'flex justify-center' : 'px-3'}`}>
                {displayCollapsed
                  ? <div className="w-5 border-t border-slate-700" />
                  : <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{t('nav.management')}</p>
                }
              </div>
              {mgmtNav.map(({ to, label, icon }) => (
                <NavLink key={to} to={to}
                  end={to === '/settings'}
                  title={displayCollapsed ? label : undefined}
                  onClick={() => { setMobileOpen(false); expandSidebar(); }}
                  className={({ isActive }) => navCls(isActive)}
                >
                  {icon}
                  {!displayCollapsed && <span className="flex-1 truncate">{label}</span>}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* Bottom: collapse toggle + logout */}
        <div className={`border-t border-slate-700/60 shrink-0 py-3 space-y-1 ${displayCollapsed ? 'px-1' : 'px-3'}`}>
          {/* Hide collapse toggle on mobile drawer */}
          <button onClick={toggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`hidden md:flex items-center gap-2 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/60 transition-all duration-150
              ${displayCollapsed ? 'justify-center w-10 mx-auto px-0' : 'px-3 w-full'}`}>
            {collapsed ? Icons.chevronsRight : Icons.chevronsLeft}
            {!displayCollapsed && <span className="text-sm font-medium">{t('btn.collapse')}</span>}
          </button>
          <button onClick={handleLogout} title={t('btn.logout')}
            className={`flex items-center gap-2 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-red-600/20 transition-all duration-150
              ${displayCollapsed ? 'justify-center w-10 mx-auto px-0' : 'px-3 w-full'}`}>
            {Icons.logout}
            {!displayCollapsed && <span className="text-sm font-medium">{t('btn.logout')}</span>}
          </button>
        </div>
      </aside>

      {/* ── Main area ──────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Route loading bar */}
        <div className={`h-0.5 w-full shrink-0 transition-opacity duration-200 print:hidden ${routing ? 'opacity-100' : 'opacity-0'}`}>
          <div className={`h-full bg-orange-400 transition-all duration-300 ease-out ${routing ? 'w-3/4' : 'w-full'}`} />
        </div>

        {/* Top header */}
        <header className="print:hidden h-14 bg-white border-b border-slate-200 flex items-center justify-between px-3 md:px-6 shrink-0 shadow-sm">
          <div className="flex items-center gap-2 md:gap-3">
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMobileOpen(o => !o)}
              className="md:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              aria-label="Open menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
            <h1 className="text-sm md:text-base font-bold text-slate-800 truncate max-w-[140px] sm:max-w-none">{pageTitle}</h1>
          </div>

          <div className="flex items-center gap-1.5 md:gap-3">
            {/* Theme toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              {theme === 'dark' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="5" strokeWidth={2}/>
                  <path strokeLinecap="round" strokeWidth={2} d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>
            <button onClick={() => setNotifOpen(o => !o)}
              className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
              {Icons.bell}
              {notifCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </button>
            <div className="w-px h-6 bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-2 pl-1">
              <div className={`w-8 h-8 rounded-full ${roleColor[role] || 'bg-slate-500'} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="text-sm leading-tight hidden sm:block">
                <p className="font-semibold text-slate-700">{user?.name}</p>
                <p className="text-xs text-slate-400 capitalize">{role}</p>
              </div>
            </div>
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
              {Icons.logout}
              <span className="hidden sm:inline">{t('btn.logout')}</span>
            </button>
          </div>
        </header>

        {/* Route-change progress bar */}
        {navigation.state !== 'idle' && (
          <div className="fixed top-0 left-0 right-0 z-[9999] h-0.5 overflow-hidden">
            <div className="h-full bg-blue-500 animate-route-progress" />
          </div>
        )}

        <main className="flex-1 min-h-0 flex flex-col relative overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <NotificationDrawer open={notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
    </>
  );
}
