import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { repo } from './data'
import { AuthProvider, useAuth } from './lib/AuthContext'
import BottomNav from './components/BottomNav'
import StartPage from './pages/StartPage'
import RecipeListPage from './pages/RecipeListPage'
import RecipeDetailPage from './pages/RecipeDetailPage'
import RecipeFormPage from './pages/RecipeFormPage'
import NewRecipeChooserPage from './pages/NewRecipeChooserPage'
import CookModePage from './pages/CookModePage'
import PantryPage from './pages/PantryPage'
import ShoppingListPage from './pages/ShoppingListPage'
import ActivityPage from './pages/ActivityPage'
import HouseholdPage from './pages/HouseholdPage'
import SettingsPage from './pages/SettingsPage'
import OnboardingPage from './pages/OnboardingPage'
import SharedRecipePage from './pages/SharedRecipePage'
import { useOnline } from './lib/useOnline'

function Shell() {
  const online = useOnline()
  return (
    <div className="mx-auto flex min-h-dvh max-w-[560px] flex-col bg-bg">
      {repo.mode === 'cloud' && !online && (
        <div className="bg-rust-solid px-4 py-2 text-center text-[11.5px] font-semibold text-bg">
          Offline – du siehst den letzten geladenen Stand. Änderungen synchronisieren wieder, sobald du online bist.
        </div>
      )}
      <div className="flex-1">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  )
}

function Gate() {
  const { authState, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg text-cream-soft text-sm">Lädt…</div>
    )
  }
  if (repo.mode === 'cloud' && !authState?.loggedIn) {
    return <OnboardingPage />
  }
  return <Shell />
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/teilen/:token" element={<SharedRecipePage />} />
        <Route path="/rezepte/:id/kochen" element={<CookModePage />} />
        <Route element={<Gate />}>
          <Route path="/" element={<StartPage />} />
          <Route path="/rezepte" element={<RecipeListPage />} />
          <Route path="/rezepte/neu" element={<NewRecipeChooserPage />} />
          <Route path="/rezepte/neu/formular" element={<RecipeFormPage mode="create" />} />
          <Route path="/rezepte/:id" element={<RecipeDetailPage />} />
          <Route path="/rezepte/:id/bearbeiten" element={<RecipeFormPage mode="edit" />} />
          <Route path="/vorrat" element={<PantryPage />} />
          <Route path="/einkauf" element={<ShoppingListPage />} />
          <Route path="/aktivitaet" element={<ActivityPage />} />
          <Route path="/haushalt" element={<HouseholdPage />} />
          <Route path="/einstellungen" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
