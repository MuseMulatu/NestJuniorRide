import { Stack } from "expo-router";

const Layout = () => {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
    name="rideshare/wait-screen"
    options={{ headerShown: false }}
  />
    <Stack.Screen
    name="post-detail"
    options={{ headerShown: false }}
  />
<Stack.Screen 
  name="profile-detail" 
    options={{ headerShown: false }}
/>
{/*          <Stack.Screen
    name="rideshare/input-screen"
    options={{ headerShown: false }}
  />*/}
      <Stack.Screen
    name="rideshare/ride-screen"
    options={{ headerShown: false }}
  />
            <Stack.Screen
    name="rideshare/find-coriders"
    options={{ headerShown: false }}
  />
    <Stack.Screen
    name="rideshare/end-screen"
    options={{ headerShown: false }}
  />
      <Stack.Screen name="find-ride" options={{ headerShown: false }} />
      <Stack.Screen
        name="confirm-ride"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ride-screen"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
};

export default Layout;
