import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { blockDomain, Settings, unblockDomain } from './src/nextdns';
import { Block, KEYS, load, save } from './src/storage';

function format(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ${s % 60}s`;
}
// Anything with a dot is treated as a website; otherwise it is an app name.
const isSite = (t: string) => t.includes('.');

export default function App() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [settings, setSettings] = useState<Settings>({ profileId: '', apiKey: '' });
  const [target, setTarget] = useState('');
  const [minutes, setMinutes] = useState('60');
  const [permanent, setPermanent] = useState(false);
  const [tab, setTab] = useState<'blocks' | 'setup'>('blocks');
  const [now, setNow] = useState(Date.now());
  const [loaded, setLoaded] = useState(false);

  // Load saved data once when the app opens.
  useEffect(() => {
    (async () => {
      setBlocks(await load<Block[]>(KEYS.blocks, []));
      setSettings(await load<Settings>(KEYS.settings, { profileId: '', apiKey: '' }));
      setLoaded(true);
    })();
  }, []);

  // Save whenever data changes (after the first load).
  useEffect(() => { if (loaded) save(KEYS.blocks, blocks); }, [blocks, loaded]);
  useEffect(() => { if (loaded) save(KEYS.settings, settings); }, [settings, loaded]);

  // Tick every second for countdowns.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // When a timed block expires, remove its site from NextDNS and drop it.
  useEffect(() => {
    if (!loaded) return;
    const expired = blocks.filter((b) => b.endsAt !== null && b.endsAt <= now);
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

  // Hard to cancel: blocks have no delete button at all.
  const locked = (b: Block) =>
    Alert.alert('Locked', b.endsAt ? `${b.target} stays blocked for ${format(b.endsAt - now)}.` : `${b.target} is permanently blocked.`);

  return (
    <View style={s.container}>
      <Text style={s.title}>Time Blocker</Text>
      <View style={s.tabs}>
        {(['blocks', 'setup'] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[s.tab, tab === t && s.tabOn]}>
            <Text style={tab === t ? s.tabTextOn : undefined}>{t === 'blocks' ? 'Blocks' : 'Setup'}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'blocks' ? (
        <>
          <TextInput style={s.input} placeholder="Site (instagram.com) or app name" value={target}
            onChangeText={setTarget} autoCapitalize="none" autoCorrect={false} />
          <View style={s.line}><Text>Permanent</Text><Switch value={permanent} onValueChange={setPermanent} /></View>
          {!permanent && <TextInput style={s.input} placeholder="Minutes" value={minutes} onChangeText={setMinutes} keyboardType="number-pad" />}
          <Pressable style={s.button} onPress={add}><Text style={s.buttonText}>Start block</Text></Pressable>
          <FlatList data={blocks} keyExtractor={(b) => b.id} renderItem={({ item }) => (
            <Pressable style={s.row} onPress={() => locked(item)}>
              <Text style={s.target}>{item.target}{isSite(item.target) ? '' : '  (app)'}</Text>
              <Text>{item.endsAt ? format(item.endsAt - now) : 'permanent'}</Text>
            </Pressable>
          )} />
        </>
      ) : (
        <ScrollView>
          <Text style={s.h}>Website blocking (NextDNS)</Text>
          <Text style={s.p}>1. Make a free account at nextdns.io.{'\n'}2. On your iPhone open apple.nextdns.io, sign in and install the profile.{'\n'}3. Paste your profile ID (6 characters, shown on the Setup page) and your API key (My Account page) below.</Text>
          <TextInput style={s.input} placeholder="Profile ID" value={settings.profileId} autoCapitalize="none"
            onChangeText={(v) => setSettings({ ...settings, profileId: v.trim() })} />
          <TextInput style={s.input} placeholder="API key" value={settings.apiKey} autoCapitalize="none" secureTextEntry
            onChangeText={(v) => setSettings({ ...settings, apiKey: v.trim() })} />
          <Text style={s.h}>App blocking (Shortcuts)</Text>
          <Text style={s.p}>iOS won't let a sideloaded app block other apps, so use a Shortcuts automation:{'\n'}1. Open Shortcuts, then Automation, then New, then App.{'\n'}2. Pick the app and choose "Is Opened". Select "Run Immediately".{'\n'}3. Add the action "Go to Home Screen".{'\n'}This is easy to turn off, so it relies on willpower.</Text>
          <Text style={s.p}>Note: timed websites are unblocked when this app is open at or after the end time. Open it once the timer ends.</Text>
        </ScrollView>
      )}
      <StatusBar style="auto" />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 72, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 12 },
  tabs: { flexDirection: 'row', marginBottom: 16, gap: 8 },
  tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#eee' },
  tabOn: { backgroundColor: '#111' },
  tabTextOn: { color: '#fff' },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 12 },
  button: { backgroundColor: '#111', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 16 },
  buttonText: { color: '#fff', fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#eee' },
  target: { fontWeight: '600' },
  h: { fontSize: 18, fontWeight: '700', marginVertical: 8 },
  p: { marginBottom: 12, lineHeight: 20 },
});
