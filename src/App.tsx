import React from 'react';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Route, Redirect } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { HomePage } from './pages/HomePage';
import { DashboardsPage } from './pages/DashboardsPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { PrivateRoute } from './components/PrivateRoute';
import { useNotifications } from './hooks/useNotifications';

setupIonicReact();

const AppShell: React.FC = () => {
  useNotifications();

  return (
    <IonApp>
      <IonReactRouter>
        <IonRouterOutlet>
          <Route exact path="/login" component={LoginPage} />
          <PrivateRoute exact path="/dashboard" component={DashboardPage} />
          <PrivateRoute exact path="/home" component={HomePage} />
          <PrivateRoute exact path="/dashboards" component={DashboardsPage} />
          <PrivateRoute exact path="/transactions" component={TransactionsPage} />
          <Route exact path="/">
            <Redirect to="/home" />
          </Route>
        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
