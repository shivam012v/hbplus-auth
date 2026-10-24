/**
 * DashboardScreen — Premium HB+ Fitness Platform Dashboard
 *
 * Layout (desktop ≥ 1024 px):
 *   ┌────────────────────────────────────────────────────────────┐
 *   │ Sidebar (220px) │ Header + Stats + Two-column main content │
 *   └────────────────────────────────────────────────────────────┘
 *
 * Layout (tablet 768–1023 px):
 *   ┌──────────────────────────────────────────────────┐
 *   │ Narrow sidebar (64px icons only) │ Main content  │
 *   └──────────────────────────────────────────────────┘
 *
 * Layout (mobile < 768 px):
 *   ┌──────────────────┐
 *   │ Top nav bar      │
 *   │ Scrollable main  │
 *   └──────────────────┘
 *
 * Authentication:
 *   Rendered only when AppNavigator confirms user !== null and the email
 *   has been validated as @hbplus.fit. No re-validation needed here.
 *
 * Data:
 *   All statistics and activity entries are clearly labelled demo data.
 *   Real user profile data is pulled from the Firebase User object.
 */

import { signOut, User } from 'firebase/auth';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { auth } from '../services/firebase';
import { validateEmailDomain } from '../utils/validateEmailDomain';

// ─── Props ────────────────────────────────────────────────────────────────────
interface DashboardScreenProps {
  user: User;
}

// ─── Breakpoints ──────────────────────────────────────────────────────────────
const BP_MOBILE  = 768;
const BP_DESKTOP = 1024;
const SIDEBAR_FULL = 220;
const SIDEBAR_MINI = 64;

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  // Page & surfaces
  pageBg:       '#0B0C1A',
  sidebarBg:    '#0F1022',
  cardBg:       '#13152A',
  cardBgAlt:    '#161830',
  headerBg:     '#0F1022',
  inputBg:      '#1A1C35',

  // Borders
  border:       'rgba(255,255,255,0.06)',
  borderMid:    'rgba(255,255,255,0.10)',

  // Text
  textPrimary:  '#F0F2FF',
  textSec:      'rgba(240,242,255,0.55)',
  textMuted:    'rgba(240,242,255,0.32)',

  // Purple — primary accent
  purple:       '#8B5CF6',
  purpleLight:  '#A78BFA',
  purpleDim:    'rgba(139,92,246,0.18)',
  purpleBorder: 'rgba(139,92,246,0.40)',
  purpleGlow:   'rgba(139,92,246,0.12)',

  // Teal — success / positive
  teal:         '#14B8A6',
  tealLight:    '#2DD4BF',
  tealDim:      'rgba(20,184,166,0.15)',
  tealBorder:   'rgba(20,184,166,0.35)',

  // Amber — warning / pending
  amber:        '#F59E0B',
  amberLight:   '#FCD34D',
  amberDim:     'rgba(245,158,11,0.15)',
  amberBorder:  'rgba(245,158,11,0.35)',

  // Rose — danger
  rose:         '#F43F5E',
  roseDim:      'rgba(244,63,94,0.15)',
  roseBorder:   'rgba(244,63,94,0.35)',
  rosePressed:  'rgba(244,63,94,0.25)',

  // Avatar
  avatarBg:     '#4C1D95',
} as const;

// ─── Demo data ────────────────────────────────────────────────────────────────

const STATS = [
  {
    id: 'members',
    label: 'Active Members',
    value: '1,248',
    sub: '+48 this month',
    positive: true,
    accent: C.teal,
    dim: C.tealDim,
    border: C.tealBorder,
    icon: '◈',
    progress: 0.74,
  },
  {
    id: 'sessions',
    label: 'Sessions This Week',
    value: '342',
    sub: '+27 vs last week',
    positive: true,
    accent: C.purple,
    dim: C.purpleDim,
    border: C.purpleBorder,
    icon: '◉',
    progress: 0.62,
  },
  {
    id: 'reviews',
    label: 'Pending Reviews',
    value: '17',
    sub: '3 overdue',
    positive: false,
    accent: C.amber,
    dim: C.amberDim,
    border: C.amberBorder,
    icon: '◎',
    progress: 0.28,
  },
] as const;

const SCHEDULE = [
  { id: 's1', time: '08:00', title: 'Member onboarding — Alex R.',   cat: 'Onboarding',  status: 'done',    color: C.teal   },
  { id: 's2', time: '09:30', title: 'Strength session — Group A',    cat: 'Session',     status: 'done',    color: C.teal   },
  { id: 's3', time: '11:00', title: 'Performance review — Jordan K.', cat: 'Review',     status: 'active',  color: C.purple },
  { id: 's4', time: '13:00', title: 'Nutrition consult — Sam L.',    cat: 'Consult',     status: 'pending', color: C.amber  },
  { id: 's5', time: '15:30', title: 'HIIT session — Group C',        cat: 'Session',     status: 'pending', color: C.amber  },
  { id: 's6', time: '17:00', title: 'Weekly team standup',           cat: 'Internal',    status: 'pending', color: C.purple },
] as const;

type ScheduleStatus = (typeof SCHEDULE)[number]['status'];

const WEEKLY_PROGRESS = [
  { day: 'Mon', sessions: 12, max: 16 },
  { day: 'Tue', sessions: 14, max: 16 },
  { day: 'Wed', sessions: 10, max: 16 },
  { day: 'Thu', sessions: 16, max: 16 },
  { day: 'Fri', sessions: 9,  max: 16 },
  { day: 'Sat', sessions: 6,  max: 16 },
  { day: 'Sun', sessions: 3,  max: 16 },
] as const;

const NOTIFICATIONS = [
  { id: 'n1', text: '3 member reviews are overdue',          time: '10 min ago',  dot: C.rose   },
  { id: 'n2', text: 'New member registered: Taylor M.',      time: '42 min ago',  dot: C.teal   },
  { id: 'n3', text: 'Monthly report is ready to export',     time: '2 hr ago',    dot: C.purple },
  { id: 'n4', text: 'Session capacity reached for Thu PM',   time: 'Yesterday',   dot: C.amber  },
] as const;

const QUICK_ACTIONS = [
  { id: 'qa1', label: 'View Members',     icon: '◈', color: C.teal   },
  { id: 'qa2', label: 'Review Sessions',  icon: '◉', color: C.purple },
  { id: 'qa3', label: 'Open Reports',     icon: '▤', color: C.amber  },
] as const;

const NAV_ITEMS = [
  { id: 'overview',  label: 'Overview',  icon: '⊞' },
  { id: 'members',   label: 'Members',   icon: '◈' },
  { id: 'sessions',  label: 'Sessions',  icon: '◉' },
  { id: 'reports',   label: 'Reports',   icon: '▤' },
  { id: 'settings',  label: 'Settings',  icon: '⚙' },
] as const;

type NavId = (typeof NAV_ITEMS)[number]['id'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitial(user: User): string {
  return (user.displayName ?? user.email ?? 'H')[0].toUpperCase();
}

function getGreeting(user: User): string {
  const name = user.displayName?.split(' ')[0] ?? 'there';
  const h = new Date().getHours();
  const prefix = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${prefix}, ${name}`;
}

function fmtDate(): string {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

const STATUS_LABEL: Record<ScheduleStatus, string> = {
  done:    'Done',
  active:  'In progress',
  pending: 'Upcoming',
};

const STATUS_COLOR: Record<ScheduleStatus, string> = {
  done:    C.teal,
  active:  C.purple,
  pending: C.amber,
};

// ─── Atomic components ────────────────────────────────────────────────────────

/** Pill-shaped status badge */
function Badge({
  label, color,
}: { label: string; color: string }) {
  return (
    <View style={[badge.pill, { backgroundColor: color + '22', borderColor: color + '55' }]}>
      <Text style={[badge.text, { color }]}>{label}</Text>
    </View>
  );
}
const badge = StyleSheet.create({
  pill: {
    borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  text: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
});

/** Thin horizontal progress bar */
function ProgressBar({
  value, color, height = 5,
}: { value: number; color: string; height?: number }) {
  return (
    <View style={[bar.track, { height }]}>
      <View style={[bar.fill, { width: `${Math.round(value * 100)}%` as unknown as number, backgroundColor: color, height }]} />
    </View>
  );
}
const bar = StyleSheet.create({
  track: {
    width: '100%', backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 99, overflow: 'hidden',
  },
  fill: { borderRadius: 99 },
});

/** Section heading with optional right-side label */
function SectionHeading({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={sh.row}>
      <Text style={sh.title}>{title}</Text>
      {sub ? <Text style={sh.sub}>{sub}</Text> : null}
    </View>
  );
}
const sh = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title: { fontSize: 13, fontWeight: '700', color: C.textPrimary, letterSpacing: 0.2 },
  sub:   { fontSize: 11, color: C.textMuted },
});

/** Thin divider */
function Divider() {
  return <View style={{ height: 1, backgroundColor: C.border, marginVertical: 14 }} />;
}

// ─── Stat cards ───────────────────────────────────────────────────────────────
function StatCard({ item }: { item: (typeof STATS)[number] }) {
  return (
    <View style={[sc.card, { borderColor: item.border }]}>
      {/* Top row: icon + trend badge */}
      <View style={sc.top}>
        <View style={[sc.iconWrap, { backgroundColor: item.dim }]}>
          <Text style={[sc.icon, { color: item.accent }]}>{item.icon}</Text>
        </View>
        <View style={[sc.trendPill, { backgroundColor: item.positive ? C.tealDim : C.amberDim }]}>
          <Text style={[sc.trendText, { color: item.positive ? C.teal : C.amber }]}>
            {item.positive ? '↑' : '↓'} {item.sub.split(' ')[0]}
          </Text>
        </View>
      </View>
      {/* Value */}
      <Text style={[sc.value, { color: item.accent }]}>{item.value}</Text>
      <Text style={sc.label}>{item.label}</Text>
      {/* Progress bar */}
      <View style={sc.barWrap}>
        <ProgressBar value={item.progress} color={item.accent} height={4} />
      </View>
      <Text style={sc.sub}>{item.sub} · demo</Text>
    </View>
  );
}
const sc = StyleSheet.create({
  card: {
    flex: 1, minWidth: 150,
    backgroundColor: C.cardBg, borderRadius: 14, borderWidth: 1,
    padding: 18, marginHorizontal: 5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 10, elevation: 5,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 18, fontWeight: '700' },
  trendPill: { borderRadius: 20, paddingHorizontal: 7, paddingVertical: 3 },
  trendText: { fontSize: 11, fontWeight: '700' },
  value: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginBottom: 3 },
  label: { fontSize: 12, color: C.textSec, fontWeight: '500', marginBottom: 10 },
  barWrap: { marginBottom: 8 },
  sub: { fontSize: 10, color: C.textMuted, fontStyle: 'italic' },
});

// ─── Schedule panel ───────────────────────────────────────────────────────────
function SchedulePanel() {
  return (
    <View style={sp.card}>
      <SectionHeading title="Today's Schedule" sub="Demo data" />
      {SCHEDULE.map((item, i) => (
        <View key={item.id} style={[sp.row, i < SCHEDULE.length - 1 && sp.rowBorder]}>
          {/* Left: time + vertical accent line */}
          <View style={sp.timeCol}>
            <View style={[sp.line, { backgroundColor: item.color }]} />
            <Text style={sp.time}>{item.time}</Text>
          </View>
          {/* Centre: title + category */}
          <View style={sp.info}>
            <Text style={sp.title} numberOfLines={1}>{item.title}</Text>
            <Text style={sp.cat}>{item.cat}</Text>
          </View>
          {/* Right: status badge */}
          <Badge
            label={STATUS_LABEL[item.status as ScheduleStatus]}
            color={STATUS_COLOR[item.status as ScheduleStatus]}
          />
        </View>
      ))}
    </View>
  );
}
const sp = StyleSheet.create({
  card: {
    backgroundColor: C.cardBg, borderRadius: 14, borderWidth: 1,
    borderColor: C.border, padding: 18, marginBottom: 16,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, gap: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  timeCol: { width: 52, alignItems: 'center', gap: 4 },
  line: { width: 2, height: 16, borderRadius: 99 },
  time: { fontSize: 11, color: C.textMuted, fontWeight: '600' },
  info: { flex: 1, minWidth: 0 },
  title: { fontSize: 13, color: C.textPrimary, fontWeight: '600', marginBottom: 2 },
  cat: { fontSize: 11, color: C.textMuted },
});

// ─── Weekly activity bar chart ─────────────────────────────────────────────────
function WeeklyActivity() {
  const max = Math.max(...WEEKLY_PROGRESS.map((d) => d.sessions));
  return (
    <View style={wa.card}>
      <SectionHeading title="Weekly Sessions" sub="Demo" />
      <View style={wa.bars}>
        {WEEKLY_PROGRESS.map((d) => {
          const ratio = d.sessions / max;
          const isToday = d.day === ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date().getDay()];
          return (
            <View key={d.day} style={wa.col}>
              {/* Bar */}
              <View style={wa.barTrack}>
                <View
                  style={[
                    wa.barFill,
                    {
                      height: `${Math.round(ratio * 100)}%` as unknown as number,
                      backgroundColor: isToday ? C.purple : C.teal,
                      opacity: isToday ? 1 : 0.55,
                    },
                  ]}
                />
              </View>
              <Text style={[wa.dayLabel, isToday && { color: C.purple }]}>{d.day}</Text>
            </View>
          );
        })}
      </View>
      <Divider />
      <View style={wa.legend}>
        <View style={wa.legendItem}>
          <View style={[wa.dot, { backgroundColor: C.purple }]} />
          <Text style={wa.legendText}>Today</Text>
        </View>
        <View style={wa.legendItem}>
          <View style={[wa.dot, { backgroundColor: C.teal, opacity: 0.55 }]} />
          <Text style={wa.legendText}>Other days</Text>
        </View>
      </View>
    </View>
  );
}
const wa = StyleSheet.create({
  card: {
    backgroundColor: C.cardBg, borderRadius: 14, borderWidth: 1,
    borderColor: C.border, padding: 18, marginBottom: 16,
  },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: 80, gap: 6, marginBottom: 8 },
  col: { flex: 1, alignItems: 'center', gap: 4 },
  barTrack: { width: '100%', flex: 1, justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 4, minHeight: 3 },
  dayLabel: { fontSize: 10, color: C.textMuted, fontWeight: '600' },
  legend: { flexDirection: 'row', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: C.textMuted },
});

// ─── Notifications panel ──────────────────────────────────────────────────────
function NotificationsPanel() {
  return (
    <View style={np.card}>
      <SectionHeading title="Notifications" sub={`${NOTIFICATIONS.length} new`} />
      {NOTIFICATIONS.map((n, i) => (
        <View key={n.id} style={[np.row, i < NOTIFICATIONS.length - 1 && np.rowBorder]}>
          <View style={[np.dot, { backgroundColor: n.dot }]} />
          <View style={np.info}>
            <Text style={np.text}>{n.text}</Text>
            <Text style={np.time}>{n.time}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
const np = StyleSheet.create({
  card: {
    backgroundColor: C.cardBg, borderRadius: 14, borderWidth: 1,
    borderColor: C.border, padding: 18, marginBottom: 16,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, gap: 10 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 4, flexShrink: 0 },
  info: { flex: 1 },
  text: { fontSize: 13, color: C.textSec, lineHeight: 18, marginBottom: 2 },
  time: { fontSize: 11, color: C.textMuted },
});

// ─── Pending actions panel ────────────────────────────────────────────────────
function PendingActions() {
  const items = [
    { id: 'p1', label: 'Complete 3 overdue member reviews',  color: C.rose,   pct: 0 },
    { id: 'p2', label: 'Approve 5 new session requests',     color: C.amber,  pct: 0.2 },
    { id: 'p3', label: 'Export monthly performance report',  color: C.purple, pct: 0.6 },
  ];
  return (
    <View style={pa.card}>
      <SectionHeading title="Pending Actions" sub="Demo" />
      {items.map((item, i) => (
        <View key={item.id} style={[pa.row, i < items.length - 1 && pa.rowBorder]}>
          <View style={[pa.bullet, { backgroundColor: item.color }]} />
          <View style={pa.info}>
            <Text style={pa.label}>{item.label}</Text>
            <View style={pa.barWrap}>
              <ProgressBar value={item.pct} color={item.color} height={3} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}
const pa = StyleSheet.create({
  card: {
    backgroundColor: C.cardBg, borderRadius: 14, borderWidth: 1,
    borderColor: C.border, padding: 18, marginBottom: 16,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, gap: 10 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  bullet: { width: 3, height: '100%', borderRadius: 99, flexShrink: 0, minHeight: 36 },
  info: { flex: 1 },
  label: { fontSize: 12, color: C.textSec, marginBottom: 6, lineHeight: 17 },
  barWrap: {},
});

// ─── Quick actions ────────────────────────────────────────────────────────────
function QuickActions({ onAction }: { onAction: (id: string) => void }) {
  return (
    <View style={qa.card}>
      <SectionHeading title="Quick Actions" />
      <View style={qa.row}>
        {QUICK_ACTIONS.map((a) => (
          <Pressable
            key={a.id}
            onPress={() => onAction(a.id)}
            accessibilityRole="button"
            accessibilityLabel={a.label}
            style={({ pressed }) => [
              qa.btn,
              { borderColor: a.color + '55', backgroundColor: a.color + '15' },
              pressed && { opacity: 0.75 },
            ]}
          >
            <Text style={[qa.icon, { color: a.color }]}>{a.icon}</Text>
            <Text style={[qa.label, { color: a.color }]}>{a.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
const qa = StyleSheet.create({
  card: {
    backgroundColor: C.cardBg, borderRadius: 14, borderWidth: 1,
    borderColor: C.border, padding: 18, marginBottom: 16,
  },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  btn: {
    flex: 1, minWidth: 90, borderRadius: 10, borderWidth: 1,
    padding: 12, alignItems: 'center', gap: 5,
  },
  icon:  { fontSize: 20 },
  label: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
});

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({
  user, activeNav, onNav, signingOut, onLogout, mini,
}: {
  user: User;
  activeNav: NavId;
  onNav: (id: NavId) => void;
  signingOut: boolean;
  onLogout: () => void;
  mini: boolean;
}) {
  return (
    <View style={[side.root, mini && side.rootMini]}>
      {/* Brand */}
      {mini ? (
        <View style={side.brandMini}>
          <Text style={side.brandMiniText}>HB<Text style={side.brandPlus}>+</Text></Text>
        </View>
      ) : (
        <View style={side.brandBlock}>
          <Text style={side.brand}>HB<Text style={side.brandPlus}>+</Text></Text>
          <Text style={side.brandSub}>Fitness Platform</Text>
        </View>
      )}

      {/* Nav items */}
      <View style={side.nav}>
        {NAV_ITEMS.map((item) => {
          const active = activeNav === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => onNav(item.id as NavId)}
              accessibilityRole="menuitem"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                side.item,
                mini && side.itemMini,
                active && side.itemActive,
                pressed && !active && side.itemPressed,
              ]}
            >
              <Text style={[side.itemIcon, active && side.itemIconActive]}>
                {item.icon}
              </Text>
              {!mini && (
                <Text style={[side.itemLabel, active && side.itemLabelActive]}>
                  {item.label}
                </Text>
              )}
              {active && !mini && <View style={side.activePip} />}
            </Pressable>
          );
        })}
      </View>

      <View style={{ flex: 1 }} />

      {/* User block + logout */}
      {!mini ? (
        <>
          <View style={side.userBlock}>
            <View style={side.userAvatar}>
              <Text style={side.userAvatarText}>{getInitial(user)}</Text>
            </View>
            <View style={side.userInfo}>
              <Text style={side.userName} numberOfLines={1}>
                {user.displayName ?? 'HB+ Member'}
              </Text>
              <Text style={side.userEmail} numberOfLines={1}>{user.email}</Text>
            </View>
          </View>
          <Pressable
            onPress={onLogout}
            disabled={signingOut}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            accessibilityState={{ busy: signingOut, disabled: signingOut }}
            style={({ pressed }) => [
              side.logoutBtn,
              pressed && side.logoutBtnPressed,
              signingOut && { opacity: 0.5 },
            ]}
          >
            {signingOut
              ? <ActivityIndicator size="small" color={C.rose} style={{ marginRight: 8 }} />
              : <Text style={side.logoutIcon}>↩  </Text>
            }
            <Text style={side.logoutLabel}>
              {signingOut ? 'Signing out…' : 'Sign out'}
            </Text>
          </Pressable>
        </>
      ) : (
        <Pressable
          onPress={onLogout}
          disabled={signingOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          style={({ pressed }) => [side.logoutMini, pressed && { opacity: 0.6 }]}
        >
          {signingOut
            ? <ActivityIndicator size="small" color={C.rose} />
            : <Text style={side.logoutMiniIcon}>↩</Text>
          }
        </Pressable>
      )}
    </View>
  );
}

const side = StyleSheet.create({
  root: {
    width: SIDEBAR_FULL, backgroundColor: C.sidebarBg,
    borderRightWidth: 1, borderRightColor: C.border,
    paddingVertical: 24, paddingHorizontal: 14, flexShrink: 0,
  },
  rootMini: { width: SIDEBAR_MINI, paddingHorizontal: 10 },

  brandBlock: { marginBottom: 28, paddingLeft: 6 },
  brand: { fontSize: 24, fontWeight: '900', color: C.textPrimary, letterSpacing: -0.5 },
  brandPlus: { color: C.purple },
  brandSub: { fontSize: 10, color: C.textMuted, letterSpacing: 0.8, marginTop: 1 },
  brandMini: { alignItems: 'center', marginBottom: 24 },
  brandMiniText: { fontSize: 18, fontWeight: '900', color: C.textPrimary },

  nav: { gap: 3 },

  item: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 10, gap: 10,
  },
  itemMini: { justifyContent: 'center', paddingHorizontal: 0 },
  itemActive: {
    backgroundColor: C.purpleDim,
    borderWidth: 1, borderColor: C.purpleBorder,
    // Subtle purple glow — web only, silently ignored native
    // @ts-ignore
    boxShadow: `0 0 12px ${C.purpleGlow}`,
  },
  itemPressed: { backgroundColor: 'rgba(255,255,255,0.04)' },
  itemIcon: { fontSize: 17, color: C.textMuted, width: 22, textAlign: 'center' },
  itemIconActive: { color: C.purpleLight },
  itemLabel: { flex: 1, fontSize: 14, color: C.textSec, fontWeight: '500' },
  itemLabelActive: { color: C.textPrimary, fontWeight: '700' },
  activePip: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.purple },

  userBlock: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    paddingTop: 16, paddingBottom: 10,
    borderTopWidth: 1, borderTopColor: C.border,
    marginTop: 12,
  },
  userAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: C.avatarBg,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  userAvatarText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  userInfo: { flex: 1, minWidth: 0 },
  userName: { fontSize: 13, fontWeight: '700', color: C.textPrimary },
  userEmail: { fontSize: 10, color: C.textMuted, marginTop: 1 },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.roseDim, borderWidth: 1, borderColor: C.roseBorder,
    borderRadius: 10, paddingVertical: 10, marginTop: 4,
  },
  logoutBtnPressed: { backgroundColor: C.rosePressed },
  logoutIcon: { fontSize: 14, color: C.rose },
  logoutLabel: { fontSize: 13, fontWeight: '600', color: C.rose },

  logoutMini: { alignItems: 'center', paddingVertical: 10, marginTop: 8 },
  logoutMiniIcon: { fontSize: 18, color: C.rose },
});

// ─── Mobile top bar ───────────────────────────────────────────────────────────
function MobileTopBar({
  user, signingOut, onLogout, activeNav, onNav,
}: {
  user: User;
  signingOut: boolean;
  onLogout: () => void;
  activeNav: NavId;
  onNav: (id: NavId) => void;
}) {
  return (
    <>
      {/* Top brand + user row */}
      <View style={mtb.bar}>
        <Text style={mtb.brand}>HB<Text style={mtb.brandPlus}>+</Text></Text>
        <View style={{ flex: 1 }} />
        <View style={mtb.avatar}>
          <Text style={mtb.avatarText}>{getInitial(user)}</Text>
        </View>
        <Pressable
          onPress={onLogout}
          disabled={signingOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          style={({ pressed }) => [mtb.logoutBtn, pressed && { opacity: 0.6 }]}
        >
          {signingOut
            ? <ActivityIndicator size="small" color={C.rose} />
            : <Text style={mtb.logoutLabel}>Sign out</Text>
          }
        </Pressable>
      </View>
      {/* Horizontal nav tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={mtb.tabsScroll}
        contentContainerStyle={mtb.tabsContent}
      >
        {NAV_ITEMS.map((item) => {
          const active = activeNav === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => onNav(item.id as NavId)}
              style={({ pressed }) => [
                mtb.tab, active && mtb.tabActive, pressed && !active && { opacity: 0.7 },
              ]}
            >
              <Text style={[mtb.tabText, active && mtb.tabTextActive]}>
                {item.icon}  {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </>
  );
}
const mtb = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.headerBg, borderBottomWidth: 1, borderBottomColor: C.border,
    paddingHorizontal: 18, paddingVertical: 13, gap: 10,
  },
  brand: { fontSize: 20, fontWeight: '900', color: C.textPrimary, letterSpacing: -0.5 },
  brandPlus: { color: C.purple },
  avatar: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: C.avatarBg,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  logoutBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: C.roseDim, borderWidth: 1, borderColor: C.roseBorder,
  },
  logoutLabel: { fontSize: 12, fontWeight: '600', color: C.rose },
  tabsScroll: { backgroundColor: C.sidebarBg, borderBottomWidth: 1, borderBottomColor: C.border },
  tabsContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 4 },
  tab: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
  },
  tabActive: { backgroundColor: C.purpleDim, borderWidth: 1, borderColor: C.purpleBorder },
  tabText: { fontSize: 13, color: C.textSec, fontWeight: '500' },
  tabTextActive: { color: C.purpleLight, fontWeight: '700' },
});

// ─── Placeholder screen ───────────────────────────────────────────────────────
function PlaceholderContent({ title }: { title: string }) {
  return (
    <View style={ph.wrap}>
      <View style={ph.card}>
        <Text style={ph.icon}>🚧</Text>
        <Text style={ph.title}>{title}</Text>
        <Text style={ph.sub}>
          This section is not yet implemented.{'\n'}
          Select Overview to return to the dashboard.
        </Text>
      </View>
    </View>
  );
}
const ph = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  card: {
    backgroundColor: C.cardBg, borderRadius: 16, borderWidth: 1,
    borderColor: C.border, padding: 32, alignItems: 'center',
    // @ts-ignore
    maxWidth: 380, width: '100%',
  },
  icon:  { fontSize: 36, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', color: C.textPrimary, marginBottom: 8 },
  sub:   { fontSize: 14, color: C.textSec, textAlign: 'center', lineHeight: 21 },
});

// ─── Main content (Overview) ──────────────────────────────────────────────────
function OverviewContent({ user, wide, onQuickAction }: {
  user: User;
  wide: boolean;
  onQuickAction: (id: string) => void;
}) {
  return (
    <ScrollView
      style={ov.scroll}
      contentContainerStyle={ov.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <View style={ov.headerRow}>
        <View style={ov.headerLeft}>
          <Text style={ov.greeting}>{getGreeting(user)}</Text>
          <Text style={ov.date}>{fmtDate()}</Text>
          <Text style={ov.tagline}>Your fitness platform command center</Text>
        </View>
        <View style={ov.domainBadge}>
          <View style={ov.domainDot} />
          <Text style={ov.domainText}>@hbplus.fit verified</Text>
        </View>
      </View>

      {/* ── Stat cards ──────────────────────────────────────────── */}
      <Text style={ov.sectionLabel}>OVERVIEW</Text>
      <View style={[ov.statsRow, !wide && ov.statsRowMobile]}>
        {STATS.map((s) => <StatCard key={s.id} item={s} />)}
      </View>

      {/* ── Two-column main (desktop) / single-column (mobile) ─── */}
      <View style={[ov.twoCol, !wide && ov.oneCol]}>
        {/* Left column: schedule */}
        <View style={wide ? ov.colMain : ov.colFull}>
          <SchedulePanel />
        </View>

        {/* Right column: weekly chart + notifications + pending + quick actions */}
        <View style={wide ? ov.colSide : ov.colFull}>
          <WeeklyActivity />
          <NotificationsPanel />
          <PendingActions />
          <QuickActions onAction={onQuickAction} />
        </View>
      </View>

      <Text style={ov.footer}>
        © {new Date().getFullYear()} HB+ Fitness Platform · Demo build
      </Text>
    </ScrollView>
  );
}

const ov = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 22, paddingBottom: 48 },

  // Header
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 24,
  },
  headerLeft: { flex: 1, minWidth: 200 },
  greeting: { fontSize: 22, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.3, marginBottom: 3 },
  date: { fontSize: 12, color: C.textMuted, marginBottom: 4 },
  tagline: { fontSize: 13, color: C.textSec },
  domainBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.tealDim, borderWidth: 1, borderColor: C.tealBorder,
    borderRadius: 20, paddingHorizontal: 11, paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  domainDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.teal },
  domainText: { fontSize: 11, fontWeight: '700', color: C.teal },

  // Section label
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: C.textMuted,
    letterSpacing: 1.4, marginBottom: 12,
  },

  // Stat cards
  statsRow: { flexDirection: 'row', marginHorizontal: -5, marginBottom: 22, flexWrap: 'nowrap' },
  statsRowMobile: { flexWrap: 'wrap', rowGap: 10 },

  // Two-column layout
  twoCol: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  oneCol: { flexDirection: 'column' },
  colMain: { flex: 3 },
  colSide: { flex: 2 },
  colFull: { width: '100%' },

  footer: { fontSize: 11, color: C.textMuted, textAlign: 'center', marginTop: 12 },
});

// ─── Root component ───────────────────────────────────────────────────────────
export default function DashboardScreen({ user }: DashboardScreenProps) {
  const { width } = useWindowDimensions();
  const isMobile  = width < BP_MOBILE;
  const isMini    = width >= BP_MOBILE && width < BP_DESKTOP;
  const isDesktop = width >= BP_DESKTOP;

  const [activeNav, setActiveNav] = useState<NavId>('overview');
  const [signingOut, setSigningOut] = useState(false);

  // ── Secondary security guard ────────────────────────────────────────────────
  // AppNavigator already prevents unauthenticated users from reaching here,
  // but we add a redundant check as defence-in-depth:
  //   1. Verify the user's email still passes domain validation.
  //   2. Force-refresh the ID token to confirm the session is still valid
  //      (detects revocations made in the Firebase console).
  // If either check fails, sign out immediately — the auth listener in
  // useAuthState will route back to LoginScreen automatically.
  useEffect(() => {
    let cancelled = false;

    async function verifySession() {
      // Domain check — should never fail here, but catches edge cases.
      const email = (user.email ?? '').trim().toLowerCase();
      if (!validateEmailDomain(email)) {
        console.warn('[DashboardScreen] domain check failed on mount — signing out');
        await signOut(auth);
        return;
      }

      // Force-refresh the token to detect revocations.
      try {
        await user.getIdToken(/* forceRefresh */ true);
        if (!cancelled) {
          console.debug('[DashboardScreen] session verified for', email);
        }
      } catch (err) {
        // Token refresh failed → session revoked or network error.
        // Firebase's onAuthStateChanged will fire with null, triggering
        // automatic redirect to LoginScreen via AppNavigator.
        console.warn('[DashboardScreen] token refresh failed:', err);
      }
    }

    verifySession();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.uid]); // re-run only if the user identity changes

  async function handleLogout() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut(auth);
      // onAuthStateChanged fires → user = null → App.tsx renders LoginScreen
    } catch (err) {
      console.error('[DashboardScreen] signOut error:', err);
      setSigningOut(false);
    }
  }

  function handleQuickAction(id: string) {
    if (id === 'qa1') setActiveNav('members');
    if (id === 'qa2') setActiveNav('sessions');
    if (id === 'qa3') setActiveNav('reports');
  }

  // Resolve the main content for the active nav item
  const mainContent = activeNav === 'overview'
    ? <OverviewContent user={user} wide={isDesktop || isMini} onQuickAction={handleQuickAction} />
    : <PlaceholderContent title={NAV_ITEMS.find((n) => n.id === activeNav)?.label ?? activeNav} />;

  return (
    <SafeAreaView style={root.safe}>
      <StatusBar style="light" />

      {isMobile ? (
        // ── Mobile layout ─────────────────────────────────────────────────────
        <View style={root.mobile}>
          <MobileTopBar
            user={user}
            signingOut={signingOut}
            onLogout={handleLogout}
            activeNav={activeNav}
            onNav={setActiveNav}
          />
          <View style={{ flex: 1 }}>{mainContent}</View>
        </View>
      ) : (
        // ── Desktop / tablet layout ───────────────────────────────────────────
        <View style={root.desktop}>
          <Sidebar
            user={user}
            activeNav={activeNav}
            onNav={setActiveNav}
            signingOut={signingOut}
            onLogout={handleLogout}
            mini={isMini}
          />
          <View style={{ flex: 1 }}>{mainContent}</View>
        </View>
      )}
    </SafeAreaView>
  );
}

const root = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.pageBg },
  desktop: { flex: 1, flexDirection: 'row' },
  mobile:  { flex: 1, flexDirection: 'column' },
});
