import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View, FlatList } from 'react-native';

// A "block" is a site or app name plus an end time. We keep them in memory for
// now; the next step is saving them to disk so they survive closing the app.
type Block = { id: string; target: string; endsAt: number };

function format(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return `${h}h ${m}m ${r}s`;
}

export default function App() {
  const [target, setTarget] = useState('');
  const [minutes, setMinutes] = useState('60');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [now, setNow] = useState(Date.now());

  // Tick every second so the countdowns update.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const add = () => {
    const mins = parseInt(minutes, 10);
    if (!target.trim() || !mins) return;
    setBlocks((b) => [...b, { id: String(Date.now()), target: target.trim(), endsAt: Date.now() + mins * 60000 }]);
    setTarget('');
  };

  // Hard to cancel: while the timer runs, the only option is a warning.
  const cancel = (b: Block) =>
    Alert.alert('Locked', `${b.target} is blocked for ${format(b.endsAt - now)} more. It can't be cancelled early.`);

  const active = blocks.filter((b) => b.endsAt > now);

  return (
    <View style={s.container}>
      <Text style={s.title}>Time Blocker</Text>
      <TextInput style={s.input} placeholder="Site or app (e.g. instagram.com)" value={target}
        onChangeText={setTarget} autoCapitalize="none" />
      <TextInput style={s.input} placeholder="Minutes" value={minutes} onChangeText={setMinutes} keyboardType="number-pad" />
      <Pressable style={s.button} onPress={add}><Text style={s.buttonText}>Start block</Text></Pressable>
      <FlatList data={active} keyExtractor={(b) => b.id} renderItem={({ item }) => (
        <Pressable style={s.row} onPress={() => cancel(item)}>
          <Text style={s.target}>{item.target}</Text>
          <Text>{format(item.endsAt - now)}</Text>
        </Pressable>
      )} />
      <StatusBar style="auto" />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 72, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 12 },
  button: { backgroundColor: '#111', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 16 },
  buttonText: { color: '#fff', fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#eee' },
  target: { fontWeight: '600' },
});
