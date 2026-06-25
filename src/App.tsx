import '@/lib/sentry';
import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorBusProvider } from '@/components/ErrorBus';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import { WorkflowPlaceholders } from '@/components/WorkflowPlaceholders';
import AdminPage from '@/pages/AdminPage';
import MitarbeitendePage from '@/pages/MitarbeitendePage';
import MitarbeitendeDetailPage from '@/pages/MitarbeitendeDetailPage';
import ItAusstattungZugaengePage from '@/pages/ItAusstattungZugaengePage';
import ItAusstattungZugaengeDetailPage from '@/pages/ItAusstattungZugaengeDetailPage';
import OnboardingMassnahmenPage from '@/pages/OnboardingMassnahmenPage';
import OnboardingMassnahmenDetailPage from '@/pages/OnboardingMassnahmenDetailPage';
import OnboardingChecklistePage from '@/pages/OnboardingChecklistePage';
import OnboardingChecklisteDetailPage from '@/pages/OnboardingChecklisteDetailPage';
import PublicFormMitarbeitende from '@/pages/public/PublicForm_Mitarbeitende';
import PublicFormItAusstattungZugaenge from '@/pages/public/PublicForm_ItAusstattungZugaenge';
import PublicFormOnboardingMassnahmen from '@/pages/public/PublicForm_OnboardingMassnahmen';
import PublicFormOnboardingCheckliste from '@/pages/public/PublicForm_OnboardingCheckliste';
// <public:imports>
// </public:imports>
// <custom:imports>
// </custom:imports>

export default function App() {
  return (
    <ErrorBoundary>
      <ErrorBusProvider>
        <HashRouter>
          <ActionsProvider>
            <Routes>
              <Route path="public/6a3cd29410af51d80bb8780e" element={<PublicFormMitarbeitende />} />
              <Route path="public/6a3cd29b3c9b632af0e46c2b" element={<PublicFormItAusstattungZugaenge />} />
              <Route path="public/6a3cd29d345bd8a6cb09280e" element={<PublicFormOnboardingMassnahmen />} />
              <Route path="public/6a3cd29d933c8e906414188a" element={<PublicFormOnboardingCheckliste />} />
              {/* <public:routes> */}
              {/* </public:routes> */}
              <Route element={<Layout />}>
                <Route index element={<><div className="mb-8"><WorkflowPlaceholders /></div><DashboardOverview /></>} />
                <Route path="mitarbeitende" element={<MitarbeitendePage />} />
                <Route path="mitarbeitende/:id" element={<MitarbeitendeDetailPage />} />
                <Route path="it-ausstattung-&-zugaenge" element={<ItAusstattungZugaengePage />} />
                <Route path="it-ausstattung-&-zugaenge/:id" element={<ItAusstattungZugaengeDetailPage />} />
                <Route path="onboarding-maßnahmen" element={<OnboardingMassnahmenPage />} />
                <Route path="onboarding-maßnahmen/:id" element={<OnboardingMassnahmenDetailPage />} />
                <Route path="onboarding-checkliste" element={<OnboardingChecklistePage />} />
                <Route path="onboarding-checkliste/:id" element={<OnboardingChecklisteDetailPage />} />
                <Route path="admin" element={<AdminPage />} />
                {/* <custom:routes> */}
                {/* </custom:routes> */}
              </Route>
            </Routes>
          </ActionsProvider>
        </HashRouter>
      </ErrorBusProvider>
    </ErrorBoundary>
  );
}
