import { AppRoutes } from "./app/router";
import { AuthProvider } from "./context/AuthContext";
import { PreferencesProvider } from "./context/PreferencesContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <PreferencesProvider>
            <AppRoutes />
          </PreferencesProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
