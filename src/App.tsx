import React from 'react';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Route, Redirect } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { PrivateRoute } from './components/PrivateRoute';

setupIonicReact();

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <IonApp>
          <IonReactRouter>
            <IonRouterOutlet>
              <Route exact path="/login" component={LoginPage} />
              <PrivateRoute exact path="/dashboard" component={DashboardPage} />
              <PrivateRoute exact path="/transactions" component={TransactionsPage} />
              <Route exact path="/">
                <Redirect to="/dashboard" />
              </Route>
            </IonRouterOutlet>
          </IonReactRouter>
        </IonApp>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;

