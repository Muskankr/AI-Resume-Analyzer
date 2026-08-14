--- a/App.tsx
@@ -10,6 +10,7 @@
 import React from 'react';
 import ReactDOM from 'react-dom';
 import AppContainer from './AppContainer';
+import { useTheme } from '@mui/material/styles';

 const App: React.FC = () => {
   return (
     <AppContainer>
       {/* Your existing code here */}
     </AppContainer>
   );
 };

+const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
+const theme = prefersDarkMode ? 'dark' : 'light';

 ReactDOM.render(
   <React.StrictMode>
-    <App />
+    <ThemeProvider theme={theme}>
+      <App />
+    </ThemeProvider>
   </React.StrictMode>,
   document.getElementById('root')
 );
