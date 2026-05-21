// In app/+not-found.tsx
import { Link, Stack } from 'expo-router';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={styles.title}>Whoops</Text>
        <Text style={styles.subtitle}>Looks like you've found a broken link or a page that has moved.</Text>

        <Link href="/(root)/(tabs)/home" asChild>
          <TouchableOpacity style={styles.link}>
            <Text style={styles.linkText}>Go to Home Screen</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f0f2f5',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A202C',
  },
  subtitle: {
    fontSize: 16,
    color: '#4A5568',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
    paddingHorizontal: 30,
    backgroundColor: '#1877F2',
    borderRadius: 8,
  },
  linkText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
});