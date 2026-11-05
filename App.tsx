import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { blockDomain, Settings, unblockDomain } from './src/nextdns';
import { Block, KEYS, load, save } from './src/storage';

const UNLOCK_DELAY_MS = 72 * 60 * 60 * 1000; // 72 hours
const C = { bg: '#0f1020', card: '#1b1d36', accent: '#7c5cff', accent2: '#ff5c8a', text: '#f4f4fb', dim: '#9a9cc0', border: '#2c2f52' };

function format(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s % 60}s`;
}
const isSite = (t: string) => t.includes('.');
// The moment a block lifts: its timer end, or the approved unlock time.
const liftsAt = (b: Block) => b.endsAt ?? b.unlockAt ?? null;

export default function App() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [settings, setSettings] = useState<Settings>({ profileId: '', apiKey: '' });
  const [target, setTarget] = useState('');
  const [minutes, setMinutes] = useState('60');
  const [permanent, setPermanent] = useState(false);
  const [tab, setTab] = useState<'blocks' | 'setup'>('blocks');
  const [now, setNow] = useState(Date.now());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      setBlocks(await load<Block[]>(KEYS.blocks, []));
      setSettings(await load<Settings>(KEYS.settings, { profileId: '', apiKey: '' }));
      setLoaded(true);
    })();
  }, []);
  useEffect(() => { if (loaded) save(KEYS.blocks, blocks); }, [blocks, loaded]);
  useEffect(() => { if (loaded) save(KEYS.settings, settings); }, [settings, loaded]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Remove blocks whose lift time has passed, and free their site in NextDNS.
  useEffect(() => {
    if (!loaded) return;
    const expired = blocks.filter((b) => { const l = liftsAt(b); return l !== null && l <= now; });
    if (!expired.length) return;
    expired.forEach((b) => {
      if (isSite(b.target) && settings.profileId) unblockDomain(settings, b.target).catch(() => {});
    });
    setBlocks((all) => all.filter((b) => !expired.includes(b)));
  }, [now, loaded]);

  const add = useCallback(async () => {
    const t = target.trim().toLowerCase();
    const mins = parseInt(minutes, 10);
    if (!t || (!permanent && !mins)) return;
    if (isSite(t) && settings.profileId && settings.apiKey) {
      try { await blockDomain(settings, t); }
      catch { Alert.alert('NextDNS error', 'Could not block the site. Check Setup.'); return; }
    } else if (isSite(t)) {
      Alert.alert('Heads up', 'Add your NextDNS details in Setup, or this site is only tracked here, not blocked.');
    }
    setBlocks((b) => [...b, { id: String(Date.now()), target: t, endsAt: permanent ? null : Date.now() + mins * 60000 }]);
    setTarget('');
  }, [target, minutes, permanent, settings]);

  const tap = (b: Block) => {
    if (b.endsAt !== null) {
      Alert.alert('Locked', `${b.target} stays blocked for ${format(b.endsAt - now)}.`);
    } else if (b.unlockAt) {
      Alert.alert('Unlock pending', `${b.target} unlocks in ${format(b.unlockAt - now)}.`, [
        { text: 'Keep waiting' },
        { text: 'Cancel unlock', style: 'destructive', onPress: () => setBlocks((all) => all.map((x) => x.id === b.id ? { ...x, unlockAt: null } : x)) },
      ]);
    } else {
      Alert.alert('Permanent block', 'Requesting an unlock starts a 72-hour wait. It stays blocked until then.', [
        { text: 'Never mind' },
        { text: 'Request unlock', onPress: () => setBlocks((all) => all.map((x) => x.id === b.id ? { ...x, unlockAt: Date.now() + UNLOCK_DELAY_MS } : x)) },
      ]);
    }
  };

  return (
    <View style={s.container}>
      <Text style={s.title}>Time Blocker</Text>
      <Text style={s.subtitle}>{blocks.length} active {blocks.length === 1 ? 'block' : 'blocks'}</Text>
      <View style={s.tabs}>
        {(['blocks', 'setup'] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[s.tab, tab === t && s.tabOn]}>
            <Text style={[s.tabText, tab === t && s.tabTextOn]}>{t === 'blocks' ? 'Blocks' : 'Setup'}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'blocks' ? (
        <>
          <View style={s.card}>
            <TextInput style={s.input} placeholder="Site (instagram.com) or app name" placeholderTextColor={C.dim}
              value={target} onChangeText={setTarget} autoCapitalize="none" autoCorrect={false} />
            <View style={s.line}>
              <Text style={s.label}>Permanent</Text>
              <Switch value={permanent} onValueChange={setPermanent} trackColor={{ true: C.accent }} />
            </View>
            {!permanent && <TextInput style={s.input} placeholder="Minutes" placeholderTextColor={C.dim}
              value={minutes} onChangeText={setMinutes} keyboardType="number-pad" />}
            <Pressable style={s.button} onPress={add}><Text style={s.buttonText}>Start block</Text></Pressable>
          </View>
          <FlatList data={blocks} keyExtractor={(b) => b.id} contentContainerStyle={{ paddingBottom: 40 }}
            ListEmptyComponent={<Text style={s.empty}>Nothing blocked. Add a site or app above.</Text>}
            renderItem={({ item }) => {
              const pending = item.endsAt === null && !!item.unlockAt;
              return (
                <Pressable style={[s.row, { borderLeftColor: item.endsAt === null ? C.accent2 : C.accent }]} onPress={() => tap(item)}>
                  <View>
                    <Text style={s.target}>{item.target}</Text>
                    <Text style={s.kind}>{isSite(item.target) ? 'Website' : 'App'}{item.endsAt === null ? ' · permanent' : ''}</Text>
                  </View>
                  <Text style={s.time}>
                    {item.endsAt ? format(item.endsAt - now) : pending ? `unlocks in ${format(item.unlockAt! - now)}` : 'tap to unlock'}
                  </Text>
                </Pressable>
              );
            }} />
        </>
      ) : (
        <ScrollView>
          <View style={s.card}>
            <Text style={s.h}>Website blocking (NextDNS)</Text>
            <Text style={s.p}>1. Make a free account at nextdns.io.{'\n'}2. On your iPhone open apple.nextdns.io, sign in and install the profile.{'\n'}3. Paste your profile ID (6 characters, shown on the Setup page) and your API key (My Account page) below.</Text>
            <TextInput style={s.input} placeholder="Profile ID" placeholderTextColor={C.dim} value={settings.profileId} autoCapitalize="none"
              onChangeText={(v) => setSettings({ ...settings, profileId: v.trim() })} />
            <TextInput style={s.input} placeholder="API key" placeholderTextColor={C.dim} value={settings.apiKey} autoCapitalize="none" secureTextEntry
              onChangeText={(v) => setSettings({ ...settings, apiKey: v.trim() })} />
          </View>
          <View style={s.card}>
            <Text style={s.h}>App blocking (Shortcuts)</Text>
            <Text style={s.p}>iOS won't let a sideloaded app block other apps, so use a Shortcuts automation:{'\n'}1. Open Shortcuts, then Automation, then New, then App.{'\n'}2. Pick the app and choose "Is Opened". Select "Run Immediately".{'\n'}3. Add the action "Go to Home Screen".{'\n'}This is easy to turn off, so it relies on willpower.</Text>
          </View>
          <Text style={s.p}>Timed and unlocking websites are freed when this app is open at or after the end time, so open it once the timer ends.</Text>
        </ScrollView>
      )}
      <StatusBar style="light" />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 72, backgroundColor: C.bg },
  title: { fontSize: 32, fontWeight: '800', color: C.text },
  subtitle: { color: C.dim, marginBottom: 16 },
  tabs: { flexDirection: 'row', marginBottom: 16, gap: 8 },
  tab: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: 20, backgroundColor: C.card },
  tabOn: { backgroundColor: C.accent },
  tabText: { color: C.dim, fontWeight: '600' },
  tabTextOn: { color: '#fff' },
  card: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  label: { color: C.text, fontSize: 16 },
  input: { backgroundColor: C.bg, color: C.text, borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  button: { backgroundColor: C.accent, padding: 14, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 4 },
  target: { color: C.text, fontWeight: '700', fontSize: 16 },
  kind: { color: C.dim, fontSize: 12, marginTop: 2 },
  time: { color: C.text, fontVariant: ['tabular-nums'] },
  empty: { color: C.dim, textAlign: 'center', marginTop: 24 },
  h: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 8 },
  p: { color: C.dim, marginBottom: 12, lineHeight: 20 },
});
