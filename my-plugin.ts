// import { withAndroidManifest, ConfigPlugin } from 'expo/config-plugins';

// const withAndroidQueries: ConfigPlugin = config => {
//   return withAndroidManifest(config, config => {
//     config.modResults.manifest.queries = [
//       {
//         intent: [
//           {
//             action: [{ $: { 'android:name': 'android.intent.action.SENDTO' } }],
//             data: [{ $: { 'android:scheme': 'mailto' } }],
//           },
//           {
//             action: [{ $: { 'android:name': 'android.intent.action.DIAL' } }],
//           },
//         ],
//       },
//     ];

//     return config;
//   });
// };

// module.exports = withAndroidQueries;
